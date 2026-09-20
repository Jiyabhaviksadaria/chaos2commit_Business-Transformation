import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, PageBreak,
  AlignmentType, BorderStyle
} from "docx"
import type { DocModel } from "./model"

export async function toDocx(doc: DocModel): Promise<Buffer> {
  const children: (Paragraph | Table)[] = []

  // Cover page
  children.push(new Paragraph({
    children: [new TextRun({ text: doc.title, bold: true, size: 48 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 2000, after: 400 }
  }))
  if (doc.subtitle) {
    children.push(new Paragraph({
      children: [new TextRun({ text: doc.subtitle, size: 28, color: "666666" })],
      alignment: AlignmentType.CENTER
    }))
  }
  children.push(new Paragraph({
    children: [new TextRun({ text: `Generated: ${doc.date}`, size: 20, color: "888888" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 }
  }))
  if (doc.disclaimer) {
    children.push(new Paragraph({
      children: [new TextRun({ text: doc.disclaimer, italics: true, size: 18, color: "888888" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 }
    }))
  }
  children.push(new Paragraph({ children: [new PageBreak()] }))

  for (const block of doc.blocks) {
    switch (block.type) {
      case "heading":
        children.push(new Paragraph({
          text: block.text,
          heading: block.level === 1 ? HeadingLevel.HEADING_1 : block.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120 }
        }))
        break
      case "paragraph":
        children.push(new Paragraph({ children: [new TextRun({ text: block.text })], spacing: { after: 160 } }))
        break
      case "list":
        block.items.forEach(item => {
          children.push(new Paragraph({
            children: [new TextRun({ text: `• ${item}` })],
            indent: { left: 360 },
            spacing: { after: 80 }
          }))
        })
        break
      case "code":
        children.push(new Paragraph({
          children: [new TextRun({ text: block.text, font: "Courier New", size: 18 })],
          spacing: { after: 160 }
        }))
        break
      case "table": {
        const tableRows = [
          new TableRow({
            children: block.headers.map(h => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
              shading: { fill: "F3F4F6" }
            }))
          }),
          ...block.rows.map(row => new TableRow({
            children: row.map(cell => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: cell })] })]
            }))
          }))
        ]
        children.push(new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" }
          }
        }))
        children.push(new Paragraph({ text: "", spacing: { after: 160 } }))
        break
      }
      case "pagebreak":
        children.push(new Paragraph({ children: [new PageBreak()] }))
        break
    }
  }

  const document = new Document({
    sections: [{ children }]
  })
  return Buffer.from(await Packer.toBuffer(document))
}
