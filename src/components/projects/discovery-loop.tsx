"use client"

import React, { useCallback, useEffect, useState } from "react"
import { ArrowRight, CheckCircle2, HelpCircle, Lightbulb, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface QuestionItem { id: string; category: string; question: string; reason?: string; whyItMatters?: string; suggestedAnswers?: string[] }
interface DiscoveryLoopProps { projectId: string; onScoreUpdate?: () => void }

export function DiscoveryLoop({ projectId, onScoreUpdate }: DiscoveryLoopProps) {
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  const loadQuestions = useCallback(async () => {
    try { const response = await fetch(`/api/projects/${projectId}/discovery/questions`); const payload = await response.json().catch(() => ({})); if (response.ok) setQuestions(Array.isArray(payload.questions) ? payload.questions : []) } catch { /* empty state is handled below */ }
  }, [projectId])
  useEffect(() => { loadQuestions() }, [loadQuestions])

  const generate = async () => {
    setLoading(true)
    try { const response = await fetch(`/api/projects/${projectId}/discovery/questions`, { method: "POST" }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Unable to generate questions."); setQuestions(payload.questions || []); toast.success("Tailored discovery questions generated.") } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to generate questions.") } finally { setLoading(false) }
  }

  const submit = async () => {
    const payload = questions.filter((question) => answers[question.id]?.trim()).map((question) => ({ questionId: question.id, category: question.category, question: question.question, answer: answers[question.id].trim() }))
    if (!payload.length) { toast.error("Please answer at least one question before submitting."); return }
    setSubmitting(true)
    try { const response = await fetch(`/api/projects/${projectId}/discovery/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: payload }) }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || "Unable to save answers."); setCompletedCount((count) => count + payload.length); setQuestions((current) => current.filter((question) => !payload.some((answer) => answer.questionId === question.id))); setAnswers({}); toast.success("Discovery answers saved to Project Context."); onScoreUpdate?.() } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save answers.") } finally { setSubmitting(false) }
  }

  return <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm"><CardHeader className="pb-4 border-b border-[#E5DFD4]"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><CardTitle className="text-base font-extrabold text-neutral-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#F472B6]" /> Clarifying Question Loop</CardTitle><CardDescription className="text-xs">Questions are generated from missing information in the persisted context and remain available after refresh.</CardDescription></div><Button onClick={generate} disabled={loading} className="bg-[#18181C] text-white text-xs font-bold rounded-full px-5 py-2 gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4 text-[#FEE895]" />} {questions.length ? "Regenerate questions" : "Generate questions"}</Button></div></CardHeader><CardContent className="pt-6 space-y-4">{completedCount > 0 && <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center gap-2 text-xs text-emerald-900 font-bold"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> {completedCount} answer(s) saved.</div>}{questions.length === 0 ? <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-8 rounded-2xl text-center"><Lightbulb className="w-8 h-8 text-neutral-400 mx-auto" /><h4 className="text-sm font-extrabold text-neutral-900 mt-3">No active questions</h4><p className="text-xs text-neutral-500 mt-1">Generate questions to surface the most important missing requirements.</p></div> : questions.map((question) => <div key={question.id} className="bg-[#FAF8F2] border border-[#E5DFD4] p-5 rounded-2xl space-y-3"><div className="flex items-center justify-between gap-3"><Badge className="bg-[#18181C] text-white border-none text-[10px] font-bold">{question.category}</Badge></div><div><h5 className="text-sm font-extrabold text-neutral-900">{question.question}</h5><p className="text-xs text-neutral-500 mt-1">{question.reason || question.whyItMatters}</p></div>{question.suggestedAnswers && question.suggestedAnswers.length > 0 && <div className="flex flex-wrap gap-2">{question.suggestedAnswers.map((answer) => <button type="button" key={answer} onClick={() => setAnswers((current) => ({ ...current, [question.id]: answer }))} className={`px-3 py-1 text-xs rounded-full border ${answers[question.id] === answer ? "bg-[#18181C] text-white" : "bg-white border-[#E5DFD4] text-neutral-700"}`}>{answer}</button>)}</div>}<Textarea value={answers[question.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="Provide a specific answer..." className="bg-white border-[#E5DFD4] text-xs rounded-xl min-h-[70px]" /></div>)}{questions.length > 0 && <div className="flex justify-end"><Button onClick={submit} disabled={submitting} className="bg-[#18181C] text-white text-xs font-bold rounded-full px-6 py-2 gap-2">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Save answers</Button></div>}</CardContent></Card>
}
