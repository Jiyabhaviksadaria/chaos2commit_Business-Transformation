/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

export const runtime = "nodejs"

let defaultIntegrations = [
  { id: "int_github", key: "github", name: "GitHub Repository Sync", category: "Developer Tools", status: "CONNECTED", details: "Connected to repository repo/main" },
  { id: "int_slack", key: "slack", name: "Slack Activity Notifications", category: "Communication", status: "CONNECTED", details: "Posting blueprint changes to #transformation-updates" },
  { id: "int_jira", key: "jira", name: "Jira Agile Issue Sync", category: "Project Management", status: "READY", details: "Ready to export roadmap epics & tasks to Jira" },
  { id: "int_m365", key: "m365", name: "Microsoft 365 / Teams", category: "Enterprise Suite", status: "READY", details: "Word & Excel doc export sync enabled" },
  { id: "int_gworkspace", key: "gworkspace", name: "Google Workspace / Drive", category: "Cloud Storage", status: "READY", details: "Google Docs & Sheets export sync enabled" }
]

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireProjectAccess(params.projectId)
    return NextResponse.json({
      ok: true,
      integrations: defaultIntegrations
    })
  } catch (error) {
    console.error("Fetch integrations error:", error)
    return NextResponse.json({ error: "Failed to fetch project integrations" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { user, project } = await requireProjectAccess(params.projectId)
    const body = await req.json()
    const { integrationId, status } = body

    defaultIntegrations = defaultIntegrations.map((item) =>
      item.id === integrationId ? { ...item, status: status || "CONNECTED" } : item
    )

    const orgId = (project as any).workspace?.organizationId || "org_default"

    await db.activityLog.create({
      data: {
        organizationId: orgId,
        projectId: params.projectId,
        actorId: user.id,
        action: "integration_updated",
        entity: "EnterpriseIntegration",
        entityId: integrationId,
        metadata: { status }
      }
    }).catch(() => null)

    return NextResponse.json({
      ok: true,
      integrations: defaultIntegrations,
      message: "Integration status updated successfully"
    })
  } catch (error) {
    console.error("Update integration error:", error)
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 })
  }
}
