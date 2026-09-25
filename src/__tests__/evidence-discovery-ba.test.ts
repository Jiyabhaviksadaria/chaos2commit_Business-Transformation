import { describe, expect, it, vi } from "vitest"

const mockDocs = vi.hoisted(() => [
  {
    id: "doc-1",
    projectId: "proj-101",
    filename: "Sales_Process.pdf",
    mimeType: "application/pdf",
    sizeBytes: 15000,
    checksum: "hash-sales-123",
    extractedText: "Sales team manually enters leads into spreadsheet. Handoff takes 3 days.",
    summary: "Overview of inbound sales process and manual lead handling.",
    entities: ["Excel", "Salesforce", "Inbound"],
    status: "READY",
    error: null,
    metadata: {
      kind: "pdf",
      pageCount: 3,
      chunks: [
        {
          id: "chunk-p1",
          filename: "Sales_Process.pdf",
          location: "Page 1",
          content: "Sales team manually enters leads into spreadsheet.",
          chunkIndex: 0,
        },
        {
          id: "chunk-p2",
          filename: "Sales_Process.pdf",
          location: "Page 2",
          content: "Handoff to fulfillment takes 3 days with repeated approval steps.",
          chunkIndex: 1,
        },
      ],
    },
  },
  {
    id: "doc-2",
    projectId: "proj-101",
    filename: "CRM_Workflow.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sizeBytes: 24000,
    checksum: "hash-crm-456",
    extractedText: "CRM system is Salesforce. Data is kept in sync via weekly CSV batch export.",
    summary: "CRM workflow and weekly synchronization rules.",
    entities: ["Salesforce", "CSV"],
    status: "READY",
    error: null,
    metadata: {
      kind: "docx",
      chunks: [
        {
          id: "chunk-crm-1",
          filename: "CRM_Workflow.docx",
          location: "Section: Integration",
          content: "Salesforce customer records exported weekly via CSV.",
          chunkIndex: 0,
        },
      ],
    },
  },
  {
    id: "doc-3",
    projectId: "proj-101",
    filename: "Corrupted_Legacy.pdf",
    mimeType: "application/pdf",
    sizeBytes: 8000,
    checksum: "hash-corrupt-789",
    extractedText: null,
    summary: null,
    entities: [],
    status: "FAILED",
    error: "Text could not be extracted from document. Scanned image without OCR.",
    metadata: { kind: "pdf" },
  },
])

vi.mock("@/lib/db", () => ({
  db: {
    document: {
      findMany: vi.fn().mockImplementation(() => Promise.resolve(mockDocs)),
    },
  },
}))

import { buildNormalizedProjectEvidence } from "@/lib/ai/evidence"
import { assessDiscoveryState } from "@/lib/ai/discovery"

describe("Evidence Normalization, Cross-Document Discovery & BA Quality", () => {
  it("builds normalized evidence with ready vs unavailable documents and provenance citations", async () => {
    const evidence = await buildNormalizedProjectEvidence("proj-101")

    expect(evidence.totalDocumentCount).toBe(3)
    expect(evidence.readyDocumentCount).toBe(2)
    expect(evidence.unavailableDocuments.length).toBe(1)
    expect(evidence.coveragePercentage).toBe(67)

    // Check provenance citations
    expect(evidence.validSourceCitations).toContain("Sales_Process.pdf")
    expect(evidence.validSourceCitations).toContain("Sales_Process.pdf, Page 1")
    expect(evidence.validSourceCitations).toContain("Sales_Process.pdf, Page 2")
    expect(evidence.validSourceCitations).toContain("CRM_Workflow.docx, Section: Integration")

    // Check synthesis text contains document metadata, evidence excerpts, and unavailable notice
    expect(evidence.synthesisText).toContain("NORMALIZED BUSINESS EVIDENCE FROM SUPPORTING DOCUMENTS")
    expect(evidence.synthesisText).toContain("Sales_Process.pdf")
    expect(evidence.synthesisText).toContain("CRM_Workflow.docx")
    expect(evidence.synthesisText).toContain("UNAVAILABLE / FAILED SUPPORTING DOCUMENTS")
    expect(evidence.synthesisText).toContain("Corrupted_Legacy.pdf")
  })

  it("scales evidence synthesis within controlled character budgets across multiple documents", async () => {
    const evidence = await buildNormalizedProjectEvidence("proj-101")
    // Total synthesis must not blow context budget
    expect(evidence.synthesisText.length).toBeLessThan(30_000)
    expect(evidence.synthesisText).toContain("[PROVENANCE: \"Sales_Process.pdf\", Page 1]")
  })

  it("assesses discovery state preserving contradictions and process bottlenecks", () => {
    const state = assessDiscoveryState({
      businessContent: "Sales process with manual data entry into Excel",
      metadata: {
        discovery: {
          understanding: {
            confirmedFacts: [{ statement: "Orders entered manually", source: "Sales_Process.pdf, Page 1" }],
            contradictions: ["Salesforce is used for customer tracking in Doc 2, while Doc 1 describes Excel as customer record."],
            processBottlenecks: ["Manual handoff to fulfillment takes 3 days with repeated approval steps."],
          },
        },
      },
    })

    expect(state.understanding.contradictions).toHaveLength(1)
    expect(state.understanding.contradictions[0]).toContain("Salesforce is used")
    expect(state.understanding.processBottlenecks).toHaveLength(1)
    expect(state.understanding.processBottlenecks[0]).toContain("Manual handoff")
  })
})
