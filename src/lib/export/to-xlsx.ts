import ExcelJS from "exceljs"
import type { DocModel } from "./model"

export async function toXlsx(doc: DocModel): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Business Transformation AI"
  wb.created = new Date()

  // Summary sheet
  const summary = wb.addWorksheet("Summary")
  summary.addRow([doc.title]).font = { bold: true, size: 16 }
  summary.addRow([])
  summary.addRow(["Generated:", doc.date])
  if (doc.disclaimer) summary.addRow(["Note:", doc.disclaimer])
  summary.addRow([])

  let currentSheet = summary
  let currentSheetName = "Summary"

  for (const block of doc.blocks) {
    switch (block.type) {
      case "heading":
        if (block.level === 1) {
          // New sheet per major heading
          currentSheetName = block.text.slice(0, 31)
          currentSheet = wb.addWorksheet(currentSheetName)
          currentSheet.addRow([block.text]).font = { bold: true, size: 14 }
          currentSheet.addRow([])
        } else {
          currentSheet.addRow([block.text]).font = { bold: true }
        }
        break
      case "paragraph":
        currentSheet.addRow([block.text])
        break
      case "list":
        block.items.forEach(item => currentSheet.addRow([`• ${item}`]))
        break
      case "table": {
        const headerRow = currentSheet.addRow(block.headers)
        headerRow.eachCell(cell => {
          cell.font = { bold: true }
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } }
        })
        block.rows.forEach(row => currentSheet.addRow(row))
        currentSheet.addRow([])
        break
      }
      case "code":
        currentSheet.addRow([block.text]).font = { name: "Courier New" }
        break
    }
  }

  // Auto-size columns for all sheets
  wb.eachSheet(sheet => {
    sheet.columns?.forEach(col => {
      let maxLen = 10
      col.eachCell?.({ includeEmpty: false }, cell => {
        const len = String(cell.value ?? "").length
        if (len > maxLen) maxLen = len
      })
      col.width = Math.min(maxLen + 2, 60)
    })
  })

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
