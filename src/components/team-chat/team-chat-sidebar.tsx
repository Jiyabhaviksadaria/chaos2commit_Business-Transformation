"use client"

import * as React from "react"
import {
  Hash,
  Lock,
  Plus,
  Search,
  MessageSquare,
  Users,
  FolderKanban,
  ChevronDown,
} from "lucide-react"
import { TeamConversationItem, TeamUser } from "@/lib/api/team-chat"
import { UnreadBadge } from "./unread-badge"
import { cn } from "@/lib/utils"

interface TeamChatSidebarProps {
  workspaceName: string
  conversations: TeamConversationItem[]
  activeConversationId: string | null
  currentUserId: string
  onSelectConversation: (id: string) => void
  onOpenCreateChannel: () => void
  onOpenCreateDM: () => void
  onOpenCreateGroup?: () => void
  unreadCounts: Record<string, number>
  className?: string
}

export function TeamChatSidebar({
  workspaceName,
  conversations,
  activeConversationId,
  currentUserId,
  onSelectConversation,
  onOpenCreateChannel,
  onOpenCreateDM,
  onOpenCreateGroup,
  unreadCounts,
  className,
}: TeamChatSidebarProps) {
  const [filterQuery, setFilterQuery] = React.useState("")
  const [companyOpen, setCompanyOpen] = React.useState(true)
  const [deptOpen, setDeptOpen] = React.useState(true)
  const [projectsOpen, setProjectsOpen] = React.useState(true)
  const [dmsOpen, setDmsOpen] = React.useState(true)
  const [groupsOpen, setGroupsOpen] = React.useState(true)

  // Categorize conversations
  const {
    companyChannels,
    departmentChannels,
    projectChannels,
    directMessages,
    groups,
  } = React.useMemo(() => {
    const q = filterQuery.trim().toLowerCase()

    const company: TeamConversationItem[] = []
    const depts: TeamConversationItem[] = []
    const projs: TeamConversationItem[] = []
    const dm: TeamConversationItem[] = []
    const grp: TeamConversationItem[] = []

    conversations.forEach((conv) => {
      let displayName = conv.name || ""
      let searchContext = ""

      if (conv.type === "DIRECT_MESSAGE") {
        const otherMember = conv.members.find((m) => m.id !== currentUserId)
        displayName = otherMember?.name || otherMember?.email || "Direct Message"
        searchContext = `${otherMember?.companyRole || ""} ${otherMember?.department || ""}`
      } else if (conv.type === "GROUP") {
        displayName = conv.name || conv.members.map((m) => m.name || m.email).join(", ")
        searchContext = conv.members.map((m) => `${m.name || ""} ${m.department || ""}`).join(" ")
      } else if (conv.projectName) {
        searchContext = conv.projectName
      }

      if (
        q &&
        !displayName.toLowerCase().includes(q) &&
        !searchContext.toLowerCase().includes(q)
      ) {
        return
      }

      if (conv.type === "CHANNEL") {
        if (conv.projectId || conv.projectName) {
          projs.push(conv)
        } else {
          const lowerName = (conv.name || "").toLowerCase()
          if (
            lowerName === "general" ||
            lowerName === "announcements" ||
            lowerName === "all-hands"
          ) {
            company.push(conv)
          } else {
            depts.push(conv)
          }
        }
      } else if (conv.type === "DIRECT_MESSAGE") {
        dm.push(conv)
      } else {
        grp.push(conv)
      }
    })

    return {
      companyChannels: company,
      departmentChannels: depts,
      projectChannels: projs,
      directMessages: dm,
      groups: grp,
    }
  }, [conversations, filterQuery, currentUserId])

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-[#FAF8F5] border-r border-[#E8E4DC] select-none",
        className
      )}
    >
      {/* Workspace Header */}
      <div className="p-4 border-b border-[#E8E4DC] flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Team Chat
          </div>
          <div className="text-base font-bold text-[#18181C] truncate">
            {workspaceName || "Workspace"}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenCreateDM}
            title="New direct message"
            className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-600 hover:text-black hover:bg-[#EFECE4] transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          {onOpenCreateGroup && (
            <button
              onClick={onOpenCreateGroup}
              title="New group conversation"
              className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-600 hover:text-black hover:bg-[#EFECE4] transition-colors"
            >
              <Users className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onOpenCreateChannel}
            title="Create channel"
            className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-600 hover:text-black hover:bg-[#EFECE4] transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter / Search input */}
      <div className="p-3">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Jump to channel, teammate, or project..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E5E0D8] rounded-full placeholder:text-neutral-400 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#18181C]"
          />
        </div>
      </div>

      {/* Conversation Lists */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 pb-4">
        {/* CHANNELS SUPER-SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2 py-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Channels
            </span>
            <button
              onClick={onOpenCreateChannel}
              title="Add channel"
              className="text-neutral-400 hover:text-neutral-900 p-0.5 rounded hover:bg-[#EFECE4]"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 1. COMPANY */}
          <div className="space-y-0.5 pl-1">
            <button
              onClick={() => setCompanyOpen(!companyOpen)}
              className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-700 w-full text-left"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform text-neutral-400",
                  !companyOpen && "-rotate-90"
                )}
              />
              <span>Company</span>
            </button>

            {companyOpen && (
              <div className="space-y-0.5 pl-2">
                {companyChannels.map((channel) => {
                  const isActive = activeConversationId === channel.id
                  const unread = unreadCounts[channel.id] ?? channel.unreadCount ?? 0

                  return (
                    <button
                      key={channel.id}
                      onClick={() => onSelectConversation(channel.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors",
                        isActive
                          ? "bg-[#18181C] text-white font-semibold shadow-xs"
                          : "text-neutral-700 hover:bg-[#EFECE4] hover:text-black",
                        unread > 0 && !isActive && "font-bold text-neutral-950"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {channel.isPrivate ? (
                          <Lock
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              isActive ? "text-neutral-300" : "text-neutral-400"
                            )}
                          />
                        ) : (
                          <Hash
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              isActive ? "text-neutral-300" : "text-neutral-400"
                            )}
                          />
                        )}
                        <span className="truncate">{channel.name}</span>
                      </div>

                      <UnreadBadge
                        count={unread}
                        className={isActive ? "bg-white text-black" : undefined}
                      />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 2. DEPARTMENTS */}
          <div className="space-y-0.5 pl-1">
            <button
              onClick={() => setDeptOpen(!deptOpen)}
              className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-700 w-full text-left"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform text-neutral-400",
                  !deptOpen && "-rotate-90"
                )}
              />
              <span>Departments</span>
            </button>

            {deptOpen && (
              <div className="space-y-0.5 pl-2">
                {departmentChannels.length === 0 ? (
                  <p className="px-2.5 py-1 text-[11px] text-neutral-400 italic">
                    No department channels
                  </p>
                ) : (
                  departmentChannels.map((channel) => {
                    const isActive = activeConversationId === channel.id
                    const unread = unreadCounts[channel.id] ?? channel.unreadCount ?? 0

                    return (
                      <button
                        key={channel.id}
                        onClick={() => onSelectConversation(channel.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors",
                          isActive
                            ? "bg-[#18181C] text-white font-semibold shadow-xs"
                            : "text-neutral-700 hover:bg-[#EFECE4] hover:text-black",
                          unread > 0 && !isActive && "font-bold text-neutral-950"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {channel.isPrivate ? (
                            <Lock
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                isActive ? "text-neutral-300" : "text-neutral-400"
                              )}
                            />
                          ) : (
                            <Hash
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                isActive ? "text-neutral-300" : "text-neutral-400"
                              )}
                            />
                          )}
                          <span className="truncate">{channel.name}</span>
                        </div>

                        <UnreadBadge
                          count={unread}
                          className={isActive ? "bg-white text-black" : undefined}
                        />
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* 3. PROJECTS */}
          <div className="space-y-0.5 pl-1">
            <button
              onClick={() => setProjectsOpen(!projectsOpen)}
              className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-700 w-full text-left"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform text-neutral-400",
                  !projectsOpen && "-rotate-90"
                )}
              />
              <span>Projects</span>
            </button>

            {projectsOpen && (
              <div className="space-y-0.5 pl-2">
                {projectChannels.length === 0 ? (
                  <p className="px-2.5 py-1 text-[11px] text-neutral-400 italic">
                    No project channels
                  </p>
                ) : (
                  projectChannels.map((channel) => {
                    const isActive = activeConversationId === channel.id
                    const unread = unreadCounts[channel.id] ?? channel.unreadCount ?? 0

                    return (
                      <button
                        key={channel.id}
                        onClick={() => onSelectConversation(channel.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors",
                          isActive
                            ? "bg-[#18181C] text-white font-semibold shadow-xs"
                            : "text-neutral-700 hover:bg-[#EFECE4] hover:text-black",
                          unread > 0 && !isActive && "font-bold text-neutral-950"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderKanban
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              isActive ? "text-amber-300" : "text-amber-600"
                            )}
                          />
                          <span className="truncate">{channel.name}</span>
                        </div>

                        <UnreadBadge
                          count={unread}
                          className={isActive ? "bg-white text-black" : undefined}
                        />
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* DIRECT MESSAGES SECTION */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-0.5">
            <button
              onClick={() => setDmsOpen(!dmsOpen)}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-800"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform text-neutral-400",
                  !dmsOpen && "-rotate-90"
                )}
              />
              <span>Direct Messages</span>
            </button>
            <button
              onClick={onOpenCreateDM}
              title="Start direct message"
              className="text-neutral-400 hover:text-neutral-900 p-0.5 rounded hover:bg-[#EFECE4]"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {dmsOpen && (
            <div className="space-y-0.5">
              {directMessages.length === 0 ? (
                <p className="px-2.5 py-1 text-[11px] text-neutral-400 italic">
                  No direct messages yet
                </p>
              ) : (
                directMessages.map((dm) => {
                  const isActive = activeConversationId === dm.id
                  const unread = unreadCounts[dm.id] ?? dm.unreadCount ?? 0
                  const otherMember: TeamUser | undefined = dm.members.find(
                    (m) => m.id !== currentUserId
                  )
                  const name = otherMember?.name || otherMember?.email || "Teammate"
                  const initial = name[0]?.toUpperCase() || "U"

                  return (
                    <button
                      key={dm.id}
                      onClick={() => onSelectConversation(dm.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors",
                        isActive
                          ? "bg-[#18181C] text-white font-semibold shadow-xs"
                          : "text-neutral-700 hover:bg-[#EFECE4] hover:text-black",
                        unread > 0 && !isActive && "font-bold text-neutral-950"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-[#18181C] text-white"
                          )}
                        >
                          {initial}
                        </div>
                        <div className="truncate flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{name}</span>
                          {otherMember?.department && (
                            <span
                              className={cn(
                                "text-[9px] px-1 rounded font-normal shrink-0",
                                isActive
                                  ? "bg-white/20 text-neutral-200"
                                  : "bg-[#EFECE4] text-neutral-500"
                              )}
                            >
                              {otherMember.department}
                            </span>
                          )}
                        </div>
                      </div>

                      <UnreadBadge
                        count={unread}
                        className={isActive ? "bg-white text-black" : undefined}
                      />
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* GROUPS SECTION */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 py-0.5">
            <button
              onClick={() => setGroupsOpen(!groupsOpen)}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-800"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform text-neutral-400",
                  !groupsOpen && "-rotate-90"
                )}
              />
              <span>Groups</span>
            </button>
            {onOpenCreateGroup && (
              <button
                onClick={onOpenCreateGroup}
                title="Create group"
                className="text-neutral-400 hover:text-neutral-900 p-0.5 rounded hover:bg-[#EFECE4]"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {groupsOpen && (
            <div className="space-y-0.5">
              {groups.length === 0 ? (
                <div className="px-2.5 py-1 text-[11px] text-neutral-400 flex items-center justify-between">
                  <span className="italic">No groups yet</span>
                  {onOpenCreateGroup && (
                    <button
                      onClick={onOpenCreateGroup}
                      className="text-[10px] font-semibold text-neutral-600 hover:text-black underline"
                    >
                      + Create
                    </button>
                  )}
                </div>
              ) : (
                groups.map((group) => {
                  const isActive = activeConversationId === group.id
                  const unread = unreadCounts[group.id] ?? group.unreadCount ?? 0
                  const name =
                    group.name ||
                    group.members
                      .map((m) => m.name || m.email)
                      .slice(0, 3)
                      .join(", ")

                  return (
                    <button
                      key={group.id}
                      onClick={() => onSelectConversation(group.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors",
                        isActive
                          ? "bg-[#18181C] text-white font-semibold shadow-xs"
                          : "text-neutral-700 hover:bg-[#EFECE4] hover:text-black",
                        unread > 0 && !isActive && "font-bold text-neutral-950"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Users
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isActive ? "text-neutral-300" : "text-neutral-400"
                          )}
                        />
                        <span className="truncate">{name}</span>
                      </div>

                      <UnreadBadge
                        count={unread}
                        className={isActive ? "bg-white text-black" : undefined}
                      />
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
