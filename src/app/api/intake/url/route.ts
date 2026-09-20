import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import dns from "dns/promises"
import * as cheerio from "cheerio"
import { db } from "@/lib/db"
import { z } from "zod"

export const runtime = "nodejs"

import { isPrivateIP } from "@/lib/ssrf"

async function resolveHostAndCheck(hostname: string): Promise<boolean> {
  try {
    const addresses = await dns.lookup(hostname, { all: true })
    for (const record of addresses) {
      if (isPrivateIP(record.address)) return false // Blocked
    }
    return true
  } catch {
    return false // If we can't resolve it, block it
  }
}

const Schema = z.object({
  projectId: z.string().min(1),
  url: z.string().url()
})

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    
    const body = await req.json()
    const { projectId, url } = Schema.parse(body)

    // Project access check
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        workspace: { organization: { memberships: { some: { userId: session.user.id } } } }
      }
    })
    
    if (!project) return NextResponse.json({ error: "Project not found or access denied" }, { status: 403 })

    let currentUrl = url
    let redirectsCount = 0
    let html = ""

    while (redirectsCount <= 3) {
      const parsedUrl = new URL(currentUrl)
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return NextResponse.json({ error: "Only http/https allowed" }, { status: 400 })
      }

      // SSRF check
      const hostname = parsedUrl.hostname
      const isSafe = await resolveHostAndCheck(hostname)
      if (!isSafe) {
        return NextResponse.json({ error: "Access to private or local network is forbidden" }, { status: 403 })
      }

      const res = await fetch(currentUrl, {
        method: "GET",
        headers: { "User-Agent": "Business-Transformation-AI-Bot/1.0" },
        redirect: "manual",
        signal: AbortSignal.timeout(10000) // 10s timeout
      })

      if (res.status >= 300 && res.status < 400 && res.headers.has("location")) {
        currentUrl = new URL(res.headers.get("location")!, currentUrl).toString()
        redirectsCount++
        continue
      }

      if (!res.ok) {
        return NextResponse.json({ error: `URL responded with status ${res.status}` }, { status: 400 })
      }

      const contentLength = res.headers.get("content-length")
      if (contentLength && parseInt(contentLength) > 2 * 1024 * 1024) {
        return NextResponse.json({ error: "Payload exceeds 2MB limit" }, { status: 400 })
      }

      const buffer = await res.arrayBuffer()
      if (buffer.byteLength > 2 * 1024 * 1024) {
        return NextResponse.json({ error: "Payload exceeds 2MB limit" }, { status: 400 })
      }

      html = new TextDecoder().decode(buffer)
      break
    }

    if (redirectsCount > 3) {
      return NextResponse.json({ error: "Too many redirects" }, { status: 400 })
    }

    // Parse with Cheerio
    const $ = cheerio.load(html)
    $("script, style, nav, footer, iframe, link, meta").remove()
    
    const title = $("title").text().trim()
    const mainText = $("body").text().replace(/\s+/g, " ").trim()
    
    const extractedText = `TITLE: ${title}\n\nCONTENT: ${mainText}`

    const intake = await db.intakeSource.create({
      data: {
        projectId,
        kind: "URL",
        label: url,
        extractedText: extractedText.substring(0, 30000), // Safety clip
        status: "READY"
      }
    })

    return NextResponse.json({ ok: true, data: intake })
  } catch (err: unknown) {
    console.error("URL Intake error:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}
