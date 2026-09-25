"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, MessageSquare, Loader2, User as UserIcon } from "lucide-react"
import { TeamUser } from "@/lib/api/team-chat"

interface CreateDMDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: TeamUser[]
  currentUserId: string
  onSelectMember: (memberId: string) => Promise<void>
}

export function CreateDMDialog({
  open,
  onOpenChange,
  members,
  currentUserId,
  onSelectMember,
}: CreateDMDialogProps) {
  const [search, setSearch] = React.useState("")
  const [isStarting, setIsStarting] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Filter out current user
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

  const handleSelect = async (memberId: string) => {
    try {
      setIsStarting(memberId)
      setError(null)
      await onSelectMember(memberId)
      onOpenChange(false)
      setSearch("")
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to open conversation.")
      }
    } finally {
      setIsStarting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-white border border-[#E5E0D8] rounded-2xl shadow-xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold tracking-tight text-[#18181C] flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-neutral-500" />
            New Direct Message
          </DialogTitle>
          <DialogDescription className="text-neutral-500 text-sm">
            Select a teammate in your workspace to start a direct 1-on-1 conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search teammates by name, role, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm rounded-xl border-[#E5E0D8] focus-visible:ring-1 focus-visible:ring-[#18181C]"
              autoFocus
            />
          </div>
        </div>

        {error && (
          <div className="mx-6 p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            {error}
          </div>
        )}

        <div className="max-h-[340px] min-h-[200px] overflow-y-auto px-4 py-2 space-y-1">
          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-400">
              <UserIcon className="h-8 w-8 mb-2 stroke-[1.5]" />
              <p className="text-sm font-medium">No teammates found</p>
              <p className="text-xs">Try searching by a different name or department.</p>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const initials = (member.name || member.email || "U")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()

              const isCurrentStarting = isStarting === member.id

              return (
                <button
                  key={member.id}
                  onClick={() => handleSelect(member.id)}
                  disabled={Boolean(isStarting)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-[#F7F4EB]/70 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-[#18181C] text-white flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-neutral-900 group-hover:text-black truncate">
                        {member.name || member.email}
                      </div>
                      <div className="text-xs text-neutral-500 truncate flex items-center gap-1.5">
                        {member.companyRole || member.department || member.email}
                        {member.department && (
                          <span className="inline-block px-1.5 py-0.2 text-[10px] font-medium bg-neutral-100 text-neutral-600 rounded">
                            {member.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {isCurrentStarting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                    ) : (
                      <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-900">
                        Chat &rarr;
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
