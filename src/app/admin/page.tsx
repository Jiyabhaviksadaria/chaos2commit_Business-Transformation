import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PlatformRole } from "@prisma/client"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== PlatformRole.PLATFORM_ADMIN) {
    redirect("/app?error=forbidden")
  }

  const [userCount, orgCount, projectCount, aiUsageCount] = await Promise.all([
    db.user.count(),
    db.organization.count(),
    db.project.count(),
    db.aiUsage.count()
  ])

  const recentUsers = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, email: true, name: true, role: true, createdAt: true }
  })

  const recentAiUsage = await db.aiUsage.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { provider: true, model: true, task: true, latencyMs: true, status: true, createdAt: true }
  })

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Admin</h1>
        <p className="text-muted-foreground mt-1">System-wide analytics and management</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: userCount },
          { label: "Organizations", value: orgCount },
          { label: "Projects", value: projectCount },
          { label: "AI Calls", value: aiUsageCount }
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Users</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{u.name ?? "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={u.role === "PLATFORM_ADMIN" ? "default" : "secondary"} className="text-xs">
                    {u.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent AI Usage</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentAiUsage.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{a.provider}</Badge>
                  <span className="text-muted-foreground">{a.task}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{a.latencyMs}ms</span>
                  <Badge
                    variant={a.status === "SUCCESS" ? "default" : a.status === "FAILED" ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {a.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
