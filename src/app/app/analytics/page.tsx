"use client"

import React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function AnalyticsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5DFD4] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <button className="h-9 w-9 rounded-full bg-white border border-[#E5DFD4] flex items-center justify-center hover:bg-neutral-100 transition-all text-neutral-700 shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Analytics & Insights</h1>
            <p className="text-xs text-neutral-500">Track transformation progress, delivery efficiency, and AI workload.</p>
          </div>
        </div>

        <Link href="/projects">
          <button className="flex items-center gap-2 bg-[#18181C] text-white text-xs font-bold px-4 py-2 rounded-full shadow hover:bg-neutral-800 transition-all">
            <span>Projects Dashboard</span>
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#FEE895] rounded-[24px] p-5 text-neutral-900 shadow-sm">
          <p className="text-xs font-bold uppercase text-neutral-800 opacity-80">Specs Generated</p>
          <p className="text-3xl font-extrabold mt-2">14 Deliverables</p>
          <p className="text-xs text-neutral-700 mt-1">100% compliance rate</p>
        </div>

        <div className="bg-[#F8B4D9] rounded-[24px] p-5 text-neutral-900 shadow-sm">
          <p className="text-xs font-bold uppercase text-neutral-800 opacity-80">AI Acceleration</p>
          <p className="text-3xl font-extrabold mt-2">18.5 hrs saved</p>
          <p className="text-xs text-neutral-700 mt-1">compared to manual modeling</p>
        </div>

        <div className="bg-[#B8DF9E] rounded-[24px] p-5 text-neutral-900 shadow-sm">
          <p className="text-xs font-bold uppercase text-neutral-800 opacity-80">Active Modules</p>
          <p className="text-3xl font-extrabold mt-2">6 Workflows</p>
          <p className="text-xs text-neutral-700 mt-1">Live in production</p>
        </div>
      </div>
    </div>
  )
}
