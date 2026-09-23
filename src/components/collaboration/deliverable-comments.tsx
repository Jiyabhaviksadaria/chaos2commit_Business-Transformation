"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MessageSquare, CheckCircle2, Send, User, RotateCcw } from "lucide-react"
import { toast } from "sonner"

export interface CommentAuthor {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

export interface DeliverableCommentItem {
  id: string
  deliverableId: string
  authorId: string
  body: string
  resolved: boolean
  createdAt: string
  author: CommentAuthor
}

interface DeliverableCommentsProps {
  projectId: string
  deliverableId: string
  deliverableTitle?: string
  className?: string
}

export function DeliverableComments({
  projectId,
  deliverableId,
  deliverableTitle,
  className = ""
}: DeliverableCommentsProps) {
  const [comments, setComments] = useState<DeliverableCommentItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [newCommentText, setNewCommentText] = useState<string>("")
  const [filter, setFilter] = useState<"all" | "unresolved">("unresolved")

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/deliverables/${deliverableId}/comments`)
      const data = await res.json()
      if (res.ok && data.ok) {
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId, deliverableId])

  useEffect(() => {
    if (deliverableId && projectId) {
      fetchComments()
    }
  }, [deliverableId, projectId, fetchComments])

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCommentText.trim() || submitting) return

    try {
      setSubmitting(true)
      const res = await fetch(`/api/projects/${projectId}/deliverables/${deliverableId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newCommentText })
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to post comment")
      }

      toast.success("Comment added")
      setNewCommentText("")
      setComments((prev) => [...prev, data.comment])
    } catch (error: any) {
      toast.error(error.message || "Failed to add comment")
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleResolve = async (commentId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/comments/${commentId}/resolve`, {
        method: "POST"
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to toggle resolution")
      }

      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, resolved: data.comment.resolved } : c))
      )
      toast.success(data.comment.resolved ? "Thread resolved" : "Thread reopened")
    } catch (error: any) {
      toast.error(error.message || "Failed to update comment")
    }
  }

  const filteredComments = comments.filter((c) => {
    if (filter === "unresolved") return !c.resolved
    return true
  })

  const unresolvedCount = comments.filter((c) => !c.resolved).length

  return (
    <Card className={`border shadow-sm ${className}`}>
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <CardTitle className="text-sm font-semibold">
            {deliverableTitle ? `Comments on ${deliverableTitle}` : "Deliverable Comments"}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {unresolvedCount} unresolved
          </Badge>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant={filter === "unresolved" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("unresolved")}
            className="text-xs h-7 px-2"
          >
            Unresolved
          </Button>
          <Button
            variant={filter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="text-xs h-7 px-2"
          >
            All ({comments.length})
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* New Comment Input */}
        <form onSubmit={handlePostComment} className="flex gap-2 items-center">
          <Input
            placeholder="Write a comment... (Tip: use @name to mention team members)"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            disabled={submitting}
            className="text-xs flex-1"
          />
          <Button type="submit" size="sm" disabled={submitting || !newCommentText.trim()} className="h-9 px-3 gap-1">
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span className="text-xs">Post</span>
          </Button>
        </form>

        {/* Comment List */}
        {loading ? (
          <div className="flex items-center justify-center py-6 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-xs">Loading comments...</span>
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            {filter === "unresolved" && comments.length > 0
              ? "All comment threads are resolved!"
              : "No comments yet. Start a discussion by posting above."}
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                id={`comment-${comment.id}`}
                className={`p-3 rounded-lg border text-xs transition-colors ${
                  comment.resolved ? "bg-slate-50 border-slate-200 opacity-75" : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                      {comment.author.name ? comment.author.name[0].toUpperCase() : <User className="w-3 h-3" />}
                    </div>
                    <span className="font-semibold text-slate-800">
                      {comment.author.name || comment.author.email || "Collaborator"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleResolve(comment.id)}
                    className="h-6 text-[10px] gap-1 px-1.5 text-slate-500 hover:text-slate-900"
                  >
                    {comment.resolved ? (
                      <>
                        <RotateCcw className="w-3 h-3 text-slate-400" /> Reopen
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Resolve
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-slate-700 whitespace-pre-wrap pl-7">{comment.body}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
