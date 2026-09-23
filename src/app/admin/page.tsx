import React from "react"
import Link from "next/link"
import { Users, Building2, Layers, Cpu, ShieldCheck, Activity, FileText, ArrowLeft, CheckCircle } from "lucide-react"

export default async function AdminPage() {
  // Demo statistics
  const userCount = 42
  const orgCount = 8
  const workspaceCount = 18
  const projectCount = 24
  const aiUsageCount = 1420

  const recentUsers = [
    { id: "u-1", name: "Jiya Sadaria", email: "jiya@enterprise.com", role: "PLATFORM_ADMIN", org: "Global Transformation Org", status: "ACTIVE" },
    { id: "u-2", name: "Alex Rivers", email: "alex.rivers@cloud.io", role: "USER", org: "Retail Solutions Inc", status: "ACTIVE" },
    { id: "u-3", name: "Samantha Vance", email: "s.vance@techcorp.com", role: "USER", org: "FinTech Global", status: "PENDING" },
  ]

  const recentAiUsage = [
    { provider: "Google Gemini", model: "gemini-1.5-pro", task: "Business Analysis Engine", latencyMs: 340, status: "SUCCESS" },
    { provider: "Google Gemini", model: "gemini-1.5-flash", task: "Solution Architecture Builder", latencyMs: 220, status: "SUCCESS" },
    { provider: "Google Gemini", model: "gemini-1.5-pro", task: "Process Intelligence BPMN", latencyMs: 410, status: "SUCCESS" },
    { provider: "OpenAI", model: "gpt-4o", task: "Database ERD Generation", latencyMs: 510, status: "SUCCESS" },
  ]

  const securityPolicies = [
    { policy: "Role-Based Access Control (RBAC)", status: "ENFORCED", scope: "Organization-wide" },
    { policy: "TLS 1.3 & AES-256 Data Encryption", status: "ACTIVE", scope: "All Storage Buckets" },
    { policy: "SSRF Protection & URL Ingestion Guard", status: "ACTIVE", scope: "Intake Pipeline" },
    { policy: "Audit Logging & AIP-160 Governance", status: "ENFORCED", scope: "Platform Admin" }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans bg-[#F7F4EB] min-h-screen">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5DFD4] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <button className="h-9 w-9 rounded-full bg-white border border-[#E5DFD4] flex items-center justify-center hover:bg-neutral-100 transition-all text-neutral-700 shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Centralized Admin Dashboard</h1>
              <span className="bg-[#F8B4D9] text-neutral-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                Enterprise Admin
              </span>
            </div>
            <p className="text-xs text-neutral-500">Workspace governance, AI model analytics, security policies, and audit logs.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/models">
            <button className="flex items-center gap-1.5 bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded-full shadow-xs hover:bg-purple-700 transition-all">
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Models</span>
            </button>
          </Link>
          <Link href="/admin/users">
            <button className="flex items-center gap-1.5 bg-neutral-800 text-white text-xs font-bold px-3 py-2 rounded-full shadow-xs hover:bg-neutral-900 transition-all">
              <Users className="w-3.5 h-3.5" />
              <span>Users</span>
            </button>
          </Link>
          <Link href="/admin/audit">
            <button className="flex items-center gap-1.5 bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-full shadow-xs hover:bg-emerald-800 transition-all">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Audit Logs</span>
            </button>
          </Link>
          <Link href="/projects">
            <button className="flex items-center gap-2 bg-[#18181C] text-white text-xs font-bold px-4 py-2 rounded-full shadow-xs hover:bg-neutral-800 transition-all">
              <span>Return to Projects</span>
            </button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Users", value: userCount, icon: Users, bg: "bg-[#FEE895]" },
          { label: "Organizations", value: orgCount, icon: Building2, bg: "bg-[#F8B4D9]" },
          { label: "Workspaces", value: workspaceCount, icon: Layers, bg: "bg-[#B8DF9E]" },
          { label: "Active Projects", value: projectCount, icon: FileText, bg: "bg-[#A3C0E4]" },
          { label: "AI Executions", value: aiUsageCount, icon: Cpu, bg: "bg-[#FDE8F3]" }
        ].map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className={`${stat.bg} rounded-[22px] p-4 text-neutral-900 shadow-sm border border-neutral-300/40 flex flex-col justify-between h-28`}>
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-neutral-700 uppercase">{stat.label}</span>
                <div className="h-7 w-7 rounded-full bg-black/10 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-neutral-900" />
                </div>
              </div>
              <p className="text-2xl font-extrabold">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* 2-Column Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Governance */}
        <div className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[24px] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5DFD4] pb-3">
            <h3 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-800" /> Organization & User Governance
            </h3>
            <span className="text-[10px] font-bold bg-white px-2.5 py-1 rounded-full border border-[#E5DFD4] text-neutral-700">3 Active Users</span>
          </div>

          <div className="space-y-3">
            {recentUsers.map((u) => (
              <div key={u.id} className="bg-white border border-[#E5DFD4] rounded-2xl p-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-neutral-900">{u.name}</p>
                  <p className="text-[11px] text-neutral-500">{u.email} • {u.org}</p>
                </div>
                <span className="bg-[#EFEAE0] text-neutral-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">{u.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Compliance */}
        <div className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[24px] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5DFD4] pb-3">
            <h3 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700" /> Security & Compliance Policies
            </h3>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">Compliant</span>
          </div>

          <div className="space-y-2.5">
            {securityPolicies.map((p, i) => (
              <div key={i} className="bg-white border border-[#E5DFD4] rounded-2xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-neutral-900">{p.policy}</span>
                </div>
                <span className="text-[10px] font-bold bg-[#FAF8F2] text-neutral-600 px-2 py-0.5 rounded-full border border-[#E5DFD4]">{p.scope}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Usage & Model Performance Logs */}
      <div className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[24px] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5DFD4] pb-3">
          <h3 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-700" /> Real-time AI Usage & Model Telemetry
          </h3>
          <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full">99.9% Uptime</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recentAiUsage.map((log, i) => (
            <div key={i} className="bg-white border border-[#E5DFD4] rounded-2xl p-3 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-neutral-900">{log.task}</span>
                  <span className="text-[10px] bg-[#FEE895] px-2 py-0.2 rounded-full font-bold text-neutral-900">{log.provider}</span>
                </div>
                <p className="text-[10px] text-neutral-500">Model: {log.model}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{log.latencyMs}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
