import { describe, expect, it } from "vitest"
import ExcelJS from "exceljs"
import {
  parseDocument,
  validateDocumentBytes,
  validateDocumentFile,
} from "@/lib/intake/documents"

describe("Document Parsers & Source Provenance", () => {
  it("extracts text and generates section/paragraph chunks with provenance for TXT and MD", async () => {
    const mdContent = `# Sales Process Overview\n\nSales representatives receive inbound leads.\n\n## Order Entry\n\nOrders are manually entered into Excel.`
    const file = new File([mdContent], "sales.md", { type: "text/markdown" })

    const validated = await validateDocumentBytes(file)
    expect(validated.kind).toBe("md")

    const parsed = await parseDocument(validated)
    expect(parsed.text).toContain("Sales Process Overview")
    expect(parsed.text).toContain("Order Entry")
    expect(parsed.metadata.chunks.length).toBeGreaterThanOrEqual(1)

    const firstChunk = parsed.metadata.chunks[0]
    expect(firstChunk.filename).toBe("sales.md")
    expect(firstChunk.location).toBeDefined()
    expect(firstChunk.content).toBeTruthy()
  })

  it("extracts structured table information, detects column types, and samples rows for CSV", async () => {
    const csvContent = `Customer,Revenue,TransactionDate,Status\nAcme Corp,12000,2024-01-15,Active\nBeta LLC,4500,2024-02-10,Pending\nGamma Inc,8900,2024-03-01,Active`
    const file = new File([csvContent], "customers.csv", { type: "text/csv" })

    const validated = await validateDocumentBytes(file)
    expect(validated.kind).toBe("csv")

    const parsed = await parseDocument(validated)
    expect(parsed.text).toContain("Total Rows: 3, Columns: 4")
    expect(parsed.text).toContain("Customer")
    expect(parsed.text).toContain("Revenue")
    expect(parsed.text).toContain("Row 1: Customer: Acme Corp, Revenue: 12000")
    expect(parsed.metadata.rowCount).toBe(3)
    expect(parsed.metadata.columnCount).toBe(4)

    const chunk = parsed.metadata.chunks[0]
    expect(chunk.location).toContain("Table")
    expect(chunk.content).toContain("Acme Corp")
  })

  it("extracts structured sheets, headers, and representative sample rows from XLSX using ExcelJS", async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet1 = workbook.addWorksheet("Pipeline")
    sheet1.addRow(["Deal Name", "Value", "Stage", "Owner"])
    sheet1.addRow(["Enterprise Cloud Migration", 150000, "Proposal", "Alice Smith"])
    sheet1.addRow(["HR Portal Setup", 35000, "Negotiation", "Bob Jones"])

    const sheet2 = workbook.addWorksheet("Staffing")
    sheet2.addRow(["Consultant", "Role", "Availability"])
    sheet2.addRow(["Charlie", "Solution Architect", "50%"])

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
    const file = new File([buffer], "deal_pipeline.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })

    const validated = await validateDocumentBytes(file)
    expect(validated.kind).toBe("xlsx")

    const parsed = await parseDocument(validated)
    expect(parsed.metadata.sheetNames).toEqual(["Pipeline", "Staffing"])
    expect(parsed.metadata.rowCount).toBeGreaterThanOrEqual(5)
    expect(parsed.text).toContain('Sheet: "Pipeline"')
    expect(parsed.text).toContain("Enterprise Cloud Migration")
    expect(parsed.text).toContain('Sheet: "Staffing"')
    expect(parsed.text).toContain("Solution Architect")

    expect(parsed.metadata.chunks.length).toBe(2)
    expect(parsed.metadata.chunks[0].location).toBe('Sheet: "Pipeline"')
    expect(parsed.metadata.chunks[1].location).toBe('Sheet: "Staffing"')
  })

  it("detects image-only/scanned PDFs with zero text and flags extraction failure without hallucination", async () => {
    // Minimal valid PDF structure with 1 blank page (no text elements)
    const blankPdfHeader =
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n" +
      "xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n" +
      "trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"

    const file = new File([blankPdfHeader], "scanned-contract.pdf", { type: "application/pdf" })
    const validated = await validateDocumentBytes(file)

    await expect(parseDocument(validated)).rejects.toThrow(/image-only\/scanned PDF|No readable text/i)
  })

  it("rejects empty documents with a clear error", () => {
    const emptyFile = new File([], "empty.txt", { type: "text/plain" })
    expect(() => validateDocumentFile(emptyFile)).toThrow(/empty/i)
  })

  it("rejects non-matching MIME types to prevent renamed binaries", async () => {
    const fakeDoc = new File(["MZ90.... executable"], "script.pdf", { type: "application/pdf" })
    await expect(validateDocumentBytes(fakeDoc)).rejects.toThrow(/invalid signature/i)
  })
})
