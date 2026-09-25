import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { ArrowRight, BarChart3, Briefcase, Sparkles } from "lucide-react"

import { authOptions } from "@/lib/auth"
import { DEMO_PROJECT_ID } from "@/lib/demo-business-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard")
  }

  if (session.user.isDemo) {
    redirect(`/projects/${session.user.demoProjectId || DEMO_PROJECT_ID}/business-analysis`)
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-neutral-500">Normal workspace</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900">Welcome, {session.user.name || "there"}</h1>
        <p className="mt-2 text-sm text-neutral-500">Manage your company workspaces and continue your transformation journey.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-[#E5DFD4] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">My projects</CardTitle>
            <Briefcase className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600">Create or select a company workspace to begin.</p>
            <Link href="/projects" className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-neutral-900 hover:underline">
              Open projects <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-[#E5DFD4] bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Business analysis</CardTitle>
            <BarChart3 className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600">Open a project to review or generate evidence-backed analysis.</p>
            <Link href="/projects" className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-neutral-900 hover:underline">
              View workspaces <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-[#E5DFD4] bg-white shadow-sm sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">AI workspace</CardTitle>
            <Sparkles className="h-4 w-4 text-[#F472B6]" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600">Use the AI assistant with your own project context.</p>
            <Link href="/app/ai" className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-neutral-900 hover:underline">
              Open AI assistant <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#E5DFD4] bg-[#FAF8F2] shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-neutral-900">Your workspace is ready</CardTitle>
          <CardDescription>Demo Mode is not active. Any company data you add or generate here belongs to your normal account.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
