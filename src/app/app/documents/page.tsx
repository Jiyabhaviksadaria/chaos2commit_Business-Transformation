"use client"

import React from "react"
import Link from "next/link"
import { FileText, ArrowLeft, Download, Plus, Search, Folder } from "lucide-react"

export default function DocumentsPage() {
  const documents = [
    { title: "POS System Requirements & Architecture Specification", type: "System Spec", project: "Retail Chain Digital Transformation", date: "Sep 20, 2026", size: "2.4 MB" },
    { title: "CRM Lead Pipeline & Integration ERD", type: "Process Model", project: "HR Consultancy & CRM Platform", date: "Sep 19, 2026", size: "1.8 MB" },
    { title: "API OpenAPI Schema (v1.4)", type: "API Spec", project: "Retail Chain Digital Transformation", date: "Sep 18, 2026", size: "840 KB" },
    { title: "Intake & Document Synthesis Summary", type: "Discovery", project: "HR Consultancy & CRM Platform", date: "Sep 15, 2026", size: "3.1 MB" },
  ]

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
            <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Knowledge Base & Documents</h1>
            <p className="text-xs text-neutral-500">Access generated PRDs, system architecture specs, and export packages.</p>
          </div>
        </div>

        <Link href="/projects">
          <button className="flex items-center gap-2 bg-[#18181C] text-white text-xs font-bold px-4 py-2 rounded-full shadow hover:bg-neutral-800 transition-all">
            <span>Projects Dashboard</span>
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {documents.map((doc, idx) => (
          <div key={idx} className="bg-[#FAF8F2] hover:bg-white border border-[#E5DFD4] rounded-[22px] p-4 flex flex-col justify-between space-y-3 transition-all shadow-sm hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-[#FEE895] flex items-center justify-center text-neutral-900 font-bold">
                <FileText className="h-5 w-5 text-neutral-800" />
              </div>
              <span className="text-[10px] font-bold bg-[#EFEAE0] text-neutral-700 px-2 py-0.5 rounded-full">{doc.type}</span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-neutral-900 line-clamp-2">{doc.title}</h4>
              <p className="text-[11px] text-neutral-500 mt-1 line-clamp-1">{doc.project}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E5DFD4] text-[10px] text-neutral-400">
              <span>{doc.date} • {doc.size}</span>
              <button className="text-neutral-800 hover:text-black font-bold flex items-center gap-1">
                <Download className="h-3 w-3" />
                <span>Export</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
