"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Search, Loader2 } from "lucide-react"
import { TeamUser } from "@/lib/api/team-chat"

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: TeamUser[]
  currentUserId: string
  onSubmit: (data: { name?: string; memberUserIds: string[] }) => Promise<void>
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  members,
  currentUserId,
  onSubmit,
}: CreateGroupDialogProps) {
  const [groupName, setGroupName] = React.useState("")
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([])
  const [search, setSearch] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Filter out current user from selection
  const eligibleMembers = members.filter((m) => m.id !== currentUserId)

  const filteredMembers = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return eligibleMembers
    return eligibleMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q) ||
        m.companyRole?.toLowerCase().includes(q)
    )
  }, [eligibleMembers, search])

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedUserIds.length === 0) {
      setError("Please select at least one teammate to include in the group.")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      await onSubmit({
        name: groupName.trim() || undefined,
        memberUserIds: selectedUserIds,
      })
      setGroupName("")
      setSelectedUserIds([])
      setSearch("")
      onOpenChange(false)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to create group conversation.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white border border-[#E5E0D8] rounded-2xl shadow-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-[#18181C] flex items-center gap-2">
              <Users className="h-5 w-5 text-neutral-500" />
              New Group Conversation
            </DialogTitle>
            <DialogDescription className="text-neutral-500 text-sm">
              Create a private group conversation across departments and teams.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {error && (
              <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="group-name" className="text-xs font-semibold text-neutral-700">
                Group Name <span className="text-neutral-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="group-name"
                placeholder="e.g. Transformation Team, Product Council"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="text-sm rounded-xl border-[#E5E0D8] focus-visible:ring-1 focus-visible:ring-[#18181C]"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-neutral-700">
                  Select Teammates
                </Label>
                <span className="text-[11px] font-medium text-neutral-500">
                  {selectedUserIds.length} selected
                </span>
              </div>

              <div className="relative flex items-center mb-2">
                <Search className="absolute left-3 h-3.5 w-3.5 text-neutral-400" />
                <Input
                  placeholder="Filter by name, department, or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs h-8 rounded-xl border-[#E5E0D8] focus-visible:ring-1 focus-visible:ring-[#18181C]"
                  disabled={isSubmitting}
                />
              </div>

              <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1 border border-[#E8E4DC] rounded-xl p-1 bg-[#FAF8F5]/50">
                {filteredMembers.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-6">
                    No teammates found matching your search.
                  </p>
                ) : (
                  filteredMembers.map((member) => {
                    const isSelected = selectedUserIds.includes(member.id)
                    const initials = (member.name || member.email || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()

                    return (
                      <div
                        key={member.id}
                        onClick={() => toggleUser(member.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-white border border-[#18181C]/20 shadow-xs"
                            : "hover:bg-white border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-4 w-4 accent-[#18181C] rounded cursor-pointer"
                          />
                          <div className="h-7 w-7 rounded-full bg-[#18181C] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-neutral-900 truncate">
                              {member.name || member.email}
                            </div>
                            <div className="text-[11px] text-neutral-500 truncate flex items-center gap-1.5">
                              {member.companyRole || member.email}
                              {member.department && (
                                <span className="inline-block px-1 py-0.2 text-[9px] font-medium bg-neutral-100 text-neutral-700 rounded">
                                  {member.department}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl border-[#E5E0D8]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={selectedUserIds.length === 0 || isSubmitting}
              className="rounded-xl bg-[#18181C] text-white hover:bg-black"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Group...
                </>
              ) : (
                `Create Group (${selectedUserIds.length})`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
