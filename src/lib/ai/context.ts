import { db } from "@/lib/db"

const MAX_DOCUMENT_LENGTH = 10000 // roughly words/chars allowed to include

export async function buildProjectContext(projectId: string, budgetLimitChars = 15000): Promise<string> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      documents: {
        where: { status: "READY" }
      },
      deliverables: {
        where: { status: "APPROVED" },
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 1
          }
        }
      }
    }
  })

  if (!project) return "Project context not found."

  let context = `Project Name: ${project.name}\n`
  if (project.industry) context += `Industry: ${project.industry}\n`
  context += `Business Goal: ${project.businessGoal}\n\n`
  
  if (project.businessContext) {
    context += `Business Context (Notes & Environment):\n${project.businessContext}\n\n`
  }

  context += `--- Documents ---\n`
  for (const doc of project.documents) {
    if (!doc.extractedText && !doc.summary) continue
    
    context += `Document (${doc.filename}):\n`
    if (doc.summary) {
       context += `SUMMARY:\n${doc.summary}\n`
    }
    
    if (doc.extractedText) {
      const text = doc.extractedText
      if (text.length <= MAX_DOCUMENT_LENGTH) {
        context += `FULL TEXT:\n${text}\n\n`
      } else {
        // head + tail truncation
      const head = text.substring(0, MAX_DOCUMENT_LENGTH / 2)
        const tail = text.substring(text.length - (MAX_DOCUMENT_LENGTH / 2))
        context += `FULL TEXT [TRUNCATED]:\n${head}\n...[CONTENT OMITTED]...\n${tail}\n\n`
      }
    } else {
      context += `\n` // newline if only summary
    }
  }

  context += `--- Approved Deliverables ---\n`
  for (const deliv of project.deliverables) {
    const version = deliv.versions[0]
    if (!version) continue
    context += `Deliverable (${deliv.type} - ${deliv.title}):\n${JSON.stringify(version.content)}\n\n`
  }

  if (context.length > budgetLimitChars) {
    // aggressive global truncate
    context = context.substring(0, budgetLimitChars) + "\n...[GLOBAL CONTEXT TRUNCATED]"
  }

  return context
}
