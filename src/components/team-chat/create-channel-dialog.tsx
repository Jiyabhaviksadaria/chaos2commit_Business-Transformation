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
import { Hash, Lock, Loader2, FolderKanban } from "lucide-react"

interface CreateChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects?: Array<{ id: string; name: string }>
  onSubmit: (data: { name: string; description?: string; isPrivate: boolean; projectId?: string }) => Promise<void>
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  projects = [],
  onSubmit,
}: CreateChannelDialogProps) {
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [projectId, setProjectId] = React.useState("")
  const [isPrivate, setIsPrivate] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitize to lowercase alphanumeric and hyphens
    const formatted = e.target.value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "")
    setName(formatted)
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Channel name is required.")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
        projectId: projectId || undefined,
      })
      setName("")
      setDescription("")
      setProjectId("")
      setIsPrivate(false)
      onOpenChange(false)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Failed to create channel.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-white border border-[#E5E0D8] rounded-2xl shadow-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-[#18181C] flex items-center gap-2">
              <Hash className="h-5 w-5 text-neutral-500" />
              Create a channel
            </DialogTitle>
            <DialogDescription className="text-neutral-500 text-sm">
              Channels are where your team communicates. They are best organized around topics, projects, or departments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="channel-name" className="text-xs font-semibold text-neutral-700">
                Channel Name
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-neutral-400 font-mono text-sm">#</span>
                <Input
                  id="channel-name"
                  placeholder="e.g. plan-launch"
                  value={name}
                  onChange={handleNameChange}
                  className="pl-8 text-sm rounded-xl border-[#E5E0D8] focus-visible:ring-1 focus-visible:ring-[#18181C]"
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-neutral-400">
                Lowercase, numbers, and hyphens only.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="channel-desc" className="text-xs font-semibold text-neutral-700">
                Description <span className="text-neutral-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="channel-desc"
                placeholder="What's this channel about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm rounded-xl border-[#E5E0D8] focus-visible:ring-1 focus-visible:ring-[#18181C]"
                disabled={isSubmitting}
              />
            </div>

            {projects.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="channel-project" className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5 text-neutral-500" />
                  Project Association <span className="text-neutral-400 font-normal">(optional)</span>
                </Label>
                <select
                  id="channel-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#E5E0D8] bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#18181C]"
                  disabled={isSubmitting}
                >
                  <option value="">None (Company / Department channel)</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-400">
                  Link this channel directly to a transformation project.
                </p>
              </div>
            )}

            <div className="pt-2">
              <div
                onClick={() => setIsPrivate(!isPrivate)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  isPrivate
                    ? "border-amber-400 bg-amber-50/40"
                    : "border-[#E5E0D8] hover:bg-neutral-50"
                }`}
              >
                <div className="mt-0.5">
                  <Lock className={`h-4 w-4 ${isPrivate ? "text-amber-600" : "text-neutral-400"}`} />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-neutral-900">Make private</div>
                  <div className="text-neutral-500">
                    When a channel is private, it can only be viewed or joined by invitation.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#18181C] rounded"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
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
              disabled={!name.trim() || isSubmitting}
              className="rounded-xl bg-[#18181C] text-white hover:bg-black"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Channel"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
