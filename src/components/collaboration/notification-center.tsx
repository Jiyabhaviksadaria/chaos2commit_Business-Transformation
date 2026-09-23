"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useCallback } from "react"
import { Bell, CheckCheck, Loader2, MessageSquare, AtSign, CheckCircle2, Sparkles, Palette, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export interface NotificationItem {
  id: string
  userId: string
  type: string
  title: string
  body: string
  link: string | null
  readAt: string | null
  createdAt: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [open, setOpen] = useState<boolean>(false)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const router = useRouter()

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/notifications")
      const data = await res.json()
      if (res.ok && data.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // auto refresh every 30s
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkAsRead = async (id: string, link?: string | null) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      if (link) {
        setOpen(false)
        router.push(link)
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" })
      const data = await res.json()
      if (res.ok && data.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
        )
        setUnreadCount(0)
        toast.success("All notifications marked as read")
      }
    } catch (error) {
      toast.error("Failed to mark notifications as read")
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "MENTION":
        return <AtSign className="w-3.5 h-3.5 text-amber-500" />
      case "COMMENT":
        return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
      case "APPROVAL":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      case "GENERATION_COMPLETE":
        return <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
      case "CUSTOMIZATION":
        return <Palette className="w-3.5 h-3.5 text-purple-500" />
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-500" />
    }
  }

  const filtered = notifications.filter((n) => (filter === "unread" ? !n.readAt : true))

  return (
    <div className="relative inline-block text-left">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative h-9 w-9 rounded-full hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-xs text-slate-800">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-rose-100 text-rose-700 font-bold">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant={filter === "all" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilter("all")}
                className="text-[10px] h-6 px-2"
              >
                All
              </Button>
              <Button
                variant={filter === "unread" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilter("unread")}
                className="text-[10px] h-6 px-2"
              >
                Unread
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="text-[10px] h-6 px-2 text-slate-500 hover:text-slate-900"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-xs">Loading...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item.id, item.link)}
                  className={`p-3 text-xs cursor-pointer transition-colors flex items-start space-x-2.5 ${
                    item.readAt ? "bg-white hover:bg-slate-50 opacity-75" : "bg-indigo-50/40 hover:bg-indigo-50/70"
                  }`}
                >
                  <div className="mt-0.5 p-1 rounded-full bg-white border border-slate-200 shadow-2xs">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold truncate ${item.readAt ? "text-slate-700" : "text-slate-900"}`}>
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5 line-clamp-2">{item.body}</p>
                  </div>
                  {item.link && <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 self-center" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
