"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, XCircle, Clock, ShieldCheck, Send, Loader2, UserCheck, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export interface ApprovalItem {
  id: string
  deliverableId: string
  requestedById: string
  reviewerId: string | null
  status: "PENDING" | "APPROVED" | "REJECTED"
  note: string | null
  createdAt: string
  updatedAt: string
  requestedBy?: {
    id: string
    name: string | null
    email: string | null
  } | null
  reviewer?: {
    id: string
    name: string | null
    email: string | null
  } | null
}

interface ApprovalWorkflowCardProps {
  projectId: string
  deliverableType: string
  deliverableTitle?: string
  currentStatus?: string
  onStatusUpdated?: (newStatus: string) => void
  className?: string
}

export function ApprovalWorkflowCard({
  projectId,
  deliverableType,
  deliverableTitle,
  currentStatus = "DRAFT",
  onStatusUpdated,
  className = ""
}: ApprovalWorkflowCardProps) {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Request review state
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false)
  const [requestNote, setRequestNote] = useState<string>("")

  // Reviewer action state
  const [activeApprovalId, setActiveApprovalId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState<string>("")
  const [reviewingAction, setReviewingAction] = useState<"APPROVED" | "REJECTED" | null>(null)

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/deliverables/${deliverableType}/approvals`)
      const data = await res.json()
      if (res.ok && data.ok) {
        setApprovals(data.approvals || [])
      }
    } catch (error) {
      console.error("Failed to fetch approvals:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId, deliverableType])

  useEffect(() => {
    if (projectId && deliverableType) {
      fetchApprovals()
    }
  }, [projectId, deliverableType, fetchApprovals])

  const latestApproval = approvals.length > 0 ? approvals[0] : null

  const handleRequestReview = async () => {
    try {
      setSubmitting(true)
      const res = await fetch(`/api/projects/${projectId}/deliverables/${deliverableType}/approvals/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: requestNote })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit review request")
      }

      toast.success("Review requested successfully")
      setShowRequestModal(false)
      setRequestNote("")
      await fetchApprovals()
      if (onStatusUpdated) onStatusUpdated("IN_REVIEW")
    } catch (error: any) {
      toast.error(error.message || "Failed to request review")
    } finally {
      setSubmitting(false)
    }
  }

  const handleActionReview = async (approvalId: string, status: "APPROVED" | "REJECTED") => {
    try {
      setSubmitting(true)
      setReviewingAction(status)
      const res = await fetch(
        `/api/projects/${projectId}/deliverables/${deliverableType}/approvals/${approvalId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, note: reviewNote })
        }
      )
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to process review action")
      }

      toast.success(status === "APPROVED" ? "Deliverable Approved!" : "Changes Requested")
      setActiveApprovalId(null)
      setReviewNote("")
      await fetchApprovals()
      if (onStatusUpdated) onStatusUpdated(status === "APPROVED" ? "APPROVED" : "CHANGES_REQUESTED")
    } catch (error: any) {
      toast.error(error.message || "Failed to process review")
    } finally {
      setSubmitting(false)
      setReviewingAction(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </Badge>
        )
      case "PENDING":
      case "IN_REVIEW":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300 gap-1">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> Under Review
          </Badge>
        )
      case "REJECTED":
      case "CHANGES_REQUESTED":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" /> Changes Requested
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="w-3 h-3 text-slate-400" /> Draft
          </Badge>
        )
    }
  }

  return (
    <Card className={`border shadow-sm ${className}`}>
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">
            {deliverableTitle ? `Sign-Off & Approvals — ${deliverableTitle}` : "Sign-Off & Approvals"}
          </CardTitle>
          {getStatusBadge(latestApproval ? latestApproval.status : currentStatus)}
        </div>

        {(!latestApproval || latestApproval.status !== "PENDING") && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowRequestModal(!showRequestModal)}
            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Request Sign-Off</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Request Sign-off inline form */}
        {showRequestModal && (
          <div className="p-3 border border-indigo-200 bg-indigo-50/50 rounded-lg space-y-2 text-xs">
            <div className="font-semibold text-indigo-900 flex items-center justify-between">
              <span>Submit Deliverable for Formal Review</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRequestModal(false)}
                className="h-6 text-[10px] text-slate-500"
              >
                Cancel
              </Button>
            </div>
            <Textarea
              placeholder="Add submission note for reviewers (e.g. Please check section 3 database constraints)..."
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              className="bg-white border-slate-300 text-xs min-h-[60px]"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={submitting}
                onClick={handleRequestReview}
                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 gap-1"
              >
                {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Submit for Review</span>
              </Button>
            </div>
          </div>
        )}

        {/* Pending Reviewer Action Panel */}
        {latestApproval && latestApproval.status === "PENDING" && (
          <div className="p-3 border border-amber-200 bg-amber-50/60 rounded-lg space-y-3">
            <div className="flex items-center justify-between text-xs text-amber-900 font-medium">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Sign-Off Requested by {latestApproval.requestedBy?.name || "Team Member"}</span>
              </span>
              <span className="text-[10px] text-amber-700">
                {new Date(latestApproval.createdAt).toLocaleString()}
              </span>
            </div>

            {latestApproval.note && (
              <p className="text-xs text-amber-800 bg-white/80 p-2 rounded border border-amber-200/60">
                &quot;{latestApproval.note}&quot;
              </p>
            )}

            {activeApprovalId === latestApproval.id ? (
              <div className="space-y-2 text-xs bg-white p-3 rounded border border-amber-300">
                <p className="font-semibold text-slate-800">Add Review Note (Optional):</p>
                <Textarea
                  placeholder="Enter decision rationale or feedback for the team..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="text-xs min-h-[50px]"
                />
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveApprovalId(null)}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={submitting}
                    onClick={() => handleActionReview(latestApproval.id, "REJECTED")}
                    className="h-7 text-xs gap-1"
                  >
                    {submitting && reviewingAction === "REJECTED" && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Request Changes</span>
                  </Button>
                  <Button
                    size="sm"
                    disabled={submitting}
                    onClick={() => handleActionReview(latestApproval.id, "APPROVED")}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                  >
                    {submitting && reviewingAction === "APPROVED" && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Approve Deliverable</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveApprovalId(latestApproval.id)}
                  className="h-7 text-xs bg-white text-slate-800 border-amber-300 hover:bg-amber-100 gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Review & Respond</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Approval History List */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
            <span>Approval History Log</span>
            <span className="text-[10px] font-normal text-slate-400">({approvals.length})</span>
          </h4>

          {loading ? (
            <div className="flex items-center justify-center py-4 text-slate-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Loading history...
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-4 text-slate-400 text-xs">
              No approval requests logged yet.
            </div>
          ) : (
            <div className="space-y-2">
              {approvals.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border rounded-md text-xs bg-white space-y-1.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-slate-800">
                        {item.requestedBy?.name || "Team Member"}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {item.note && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                      &quot;{item.note}&quot;
                    </p>
                  )}

                  {item.reviewer && (
                    <div className="text-[10px] text-slate-500 pt-0.5 border-t border-slate-100 flex items-center space-x-1">
                      <UserCheck className="w-3 h-3 text-indigo-500" />
                      <span>Reviewed by {item.reviewer.name || item.reviewer.email}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
