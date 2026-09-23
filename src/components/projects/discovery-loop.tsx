"use client"

import React, { useState } from "react"
import { Sparkles, HelpCircle, CheckCircle2, Loader2, ArrowRight, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface QuestionItem {
  id: string
  category: string
  question: string
  whyItMatters: string
  suggestedAnswer?: string
}

interface DiscoveryLoopProps {
  projectId: string
  onScoreUpdate?: () => void
}

export function DiscoveryLoop({ projectId, onScoreUpdate }: DiscoveryLoopProps) {
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  const handleGenerateQuestions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/discovery/questions`, {
        method: "POST"
      })
      const data = await res.json()
      if (res.ok) {
        setQuestions(data.questions || [])
        toast.success("Generated tailored discovery questions!")
      } else {
        throw new Error(data.error || "Failed to generate questions")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error generating questions")
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (qId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  const handleUseSuggestion = (qId: string, suggestion?: string) => {
    if (!suggestion) return
    setAnswers(prev => ({ ...prev, [qId]: suggestion }))
  }

  const handleSubmitAnswers = async () => {
    const payload = questions
      .filter(q => !!answers[q.id]?.trim())
      .map(q => ({
        category: q.category,
        question: q.question,
        answer: answers[q.id].trim()
      }))

    if (payload.length === 0) {
      toast.error("Please answer at least one question before submitting.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/discovery/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("Discovery responses saved! Readiness metrics updated.")
        setCompletedCount(prev => prev + payload.length)
        setQuestions(prev => prev.filter(q => !answers[q.id]?.trim()))
        if (onScoreUpdate) onScoreUpdate()
      } else {
        throw new Error(data.error || "Failed to save answers")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error saving answers")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm font-sans">
      <CardHeader className="pb-4 border-b border-[#E5DFD4]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#F472B6]" />
              AI Discovery Questioning Loop
            </CardTitle>
            <CardDescription className="text-xs">
              Interactive clarification engine to eliminate requirements ambiguity.
            </CardDescription>
          </div>

          <Button
            onClick={handleGenerateQuestions}
            disabled={loading}
            className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full px-5 py-2 gap-2 shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HelpCircle className="h-4 w-4 text-[#FEE895]" />}
            {questions.length > 0 ? "Regenerate Questions" : "Generate Discovery Questions"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {completedCount > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center gap-2 text-xs text-emerald-900 font-bold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Successfully answered {completedCount} discovery question(s). Context appended to PRD pipeline.</span>
          </div>
        )}

        {questions.length === 0 && !loading && (
          <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-8 rounded-2xl text-center space-y-3">
            <Lightbulb className="h-8 w-8 text-neutral-400 mx-auto" />
            <h4 className="text-sm font-extrabold text-neutral-900">No active discovery questions pending</h4>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Click &quot;Generate Discovery Questions&quot; to let AI inspect your business goals and highlight missing architecture requirements.
            </p>
          </div>
        )}

        {questions.map((q) => (
          <div key={q.id} className="bg-[#FAF8F2] border border-[#E5DFD4] p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-[#18181C] text-white border-none text-[10px] font-bold">
                {q.category}
              </Badge>
              {q.suggestedAnswer && (
                <button
                  type="button"
                  onClick={() => handleUseSuggestion(q.id, q.suggestedAnswer)}
                  className="text-[11px] font-bold text-neutral-600 hover:text-neutral-900 underline"
                >
                  Use AI Suggestion
                </button>
              )}
            </div>

            <div>
              <h5 className="font-extrabold text-sm text-neutral-900">{q.question}</h5>
              <p className="text-xs text-neutral-500 mt-0.5 italic">Why it matters: {q.whyItMatters}</p>
            </div>

            <Textarea
              value={answers[q.id] || ""}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
              placeholder={q.suggestedAnswer ? `e.g. ${q.suggestedAnswer}` : "Provide details for your architecture..."}
              className="bg-white border-[#E5DFD4] text-xs rounded-xl min-h-[70px]"
            />
          </div>
        ))}

        {questions.length > 0 && (
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmitAnswers}
              disabled={submitting}
              className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full px-6 py-2 gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Submit Discovery Answers
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
