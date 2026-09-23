/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { sendNotification, notifyProjectMembers, parseAndNotifyMentions } from "@/lib/notifications"
import { GET as getNotifications } from "@/app/api/notifications/route"
import { POST as markNotificationRead } from "@/app/api/notifications/[notificationId]/read/route"
import { POST as markAllNotificationsRead } from "@/app/api/notifications/read-all/route"
import { GET as getComments, POST as postComment } from "@/app/api/projects/[projectId]/deliverables/[type]/comments/route"
import { POST as resolveComment } from "@/app/api/projects/[projectId]/comments/[commentId]/resolve/route"
import { GET as getActivityLogs } from "@/app/api/projects/[projectId]/activity/route"

// Mock Prisma db
const mockNotificationsStore: any[] = []
const mockCommentsStore: any[] = []
const mockActivityLogsStore: any[] = []
const mockUsersStore = [
  { id: "user_test_1", name: "Alice Lead", email: "alice@test.com" },
  { id: "user_test_2", name: "Bob Dev", email: "bob@test.com" }
]

vi.mock("@/lib/db", () => ({
  db: {
    notification: {
      create: vi.fn(async ({ data }: any) => {
        const item = { id: `notif_${Date.now()}_${Math.random()}`, ...data, createdAt: new Date() }
        mockNotificationsStore.push(item)
        return item
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return mockNotificationsStore.filter((n) => n.userId === where.userId)
      }),
      count: vi.fn(async ({ where }: any) => {
        return mockNotificationsStore.filter((n) => n.userId === where.userId && (where.readAt === null ? !n.readAt : true)).length
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        return mockNotificationsStore.find((n) => n.id === where.id) || null
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const item = mockNotificationsStore.find((n) => n.id === where.id)
        if (item) {
          item.readAt = data.readAt
        }
        return item
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0
        mockNotificationsStore.forEach((n) => {
          if (n.userId === where.userId && !n.readAt) {
            n.readAt = data.readAt
            count++
          }
        })
        return { count }
      })
    },
    comment: {
      create: vi.fn(async ({ data }: any) => {
        const item = {
          id: `comment_${Date.now()}`,
          ...data,
          createdAt: new Date(),
          author: mockUsersStore.find((u) => u.id === data.authorId) || { id: data.authorId, name: "User", email: "u@test.com" }
        }
        mockCommentsStore.push(item)
        return item
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return mockCommentsStore.filter((c) => c.deliverableId === where.deliverableId)
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        return mockCommentsStore.find((c) => c.id === where.id) || null
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const item = mockCommentsStore.find((c) => c.id === where.id)
        if (item) {
          item.resolved = data.resolved
        }
        return item
      })
    },
    activityLog: {
      create: vi.fn(async ({ data }: any) => {
        const item = { id: `act_${Date.now()}`, ...data, createdAt: new Date() }
        mockActivityLogsStore.push(item)
        return item
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return mockActivityLogsStore.filter((a) => a.projectId === where.projectId)
      })
    },
    user: {
      findMany: vi.fn(async ({ where }: any) => {
        if (!where?.OR) return mockUsersStore
        return mockUsersStore.filter((u) =>
          where.OR.some((outerCond: any) => {
            const innerList = outerCond.OR || [outerCond]
            return innerList.some((cond: any) =>
              (cond.name?.contains && u.name.toLowerCase().includes(cond.name.contains.toLowerCase())) ||
              (cond.email?.contains && u.email.toLowerCase().includes(cond.email.contains.toLowerCase())) ||
              cond.id === u.id
            )
          })
        )
      })
    },
    project: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id === "proj_phase10") {
          return {
            id: "proj_phase10",
            name: "Phase 10 Enterprise",
            workspace: {
              organizationId: "org_phase10",
              organization: {
                memberships: [
                  { userId: "user_test_1" },
                  { userId: "user_test_2" }
                ]
              }
            }
          }
        }
        return null
      })
    },
    deliverable: {
      findFirst: vi.fn(async () => {
        return { id: "deliv_phase10", type: "WEBSITE_SPEC", title: "Website Spec" }
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id === "deliv_phase10") {
          return { id: "deliv_phase10", type: "WEBSITE_SPEC", title: "Website Spec" }
        }
        return null
      }),
      create: vi.fn(async ({ data }: any) => {
        return { id: "deliv_phase10", ...data }
      })
    }
  }
}))

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => ({
    user: { id: "user_test_1", name: "Alice Lead", email: "alice@test.com" }
  }))
}))

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn(async (projectId: string) => {
    if (projectId === "unauthorized") {
      const err = new Error("Access Denied")
      err.name = "AccessError"
      throw err
    }
    return {
      user: { id: "user_test_1", name: "Alice Lead", email: "alice@test.com" },
      project: { id: projectId, workspace: { organizationId: "org_phase10" } }
    }
  })
}))

describe("Phase 10 — Collaboration, Comments, Notifications & Activity Log", () => {
  beforeEach(() => {
    mockNotificationsStore.length = 0
    mockCommentsStore.length = 0
    mockActivityLogsStore.length = 0
  })

  describe("Notifications Library & Helpers", () => {
    it("should send a notification to a specific user", async () => {
      const notif = await sendNotification({
        userId: "user_test_1",
        type: "SYSTEM",
        title: "Test System Event",
        body: "Your system spec has been compiled."
      })

      expect(notif).toBeDefined()
      expect(notif?.userId).toBe("user_test_1")
      expect(mockNotificationsStore.length).toBe(1)
    })

    it("should notify project members excluding author", async () => {
      const sent = await notifyProjectMembers({
        projectId: "proj_phase10",
        excludeUserId: "user_test_1",
        type: "COMMENT",
        title: "New Comment",
        body: "Bob mentioned something."
      })

      expect(sent.length).toBe(1)
      expect(sent[0]?.userId).toBe("user_test_2")
    })

    it("should parse @mentions in text and send MENTION notification", async () => {
      const sent = await parseAndNotifyMentions({
        text: "Hey @Bob, please check this website section!",
        authorId: "user_test_1",
        authorName: "Alice Lead",
        projectId: "proj_phase10",
        deliverableTitle: "Website Spec"
      })

      expect(sent.length).toBe(1)
      expect(sent[0]?.type).toBe("MENTION")
      expect(sent[0]?.userId).toBe("user_test_2")
    })
  })

  describe("Notifications API Endpoints", () => {
    it("should list notifications for the authenticated user (`GET /api/notifications`)", async () => {
      await sendNotification({ userId: "user_test_1", type: "COMMENT", title: "C1", body: "B1" })
      await sendNotification({ userId: "user_test_1", type: "MENTION", title: "M1", body: "B2" })

      const res = await getNotifications()
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.notifications.length).toBe(2)
      expect(body.unreadCount).toBe(2)
    })

    it("should mark a single notification as read (`POST /api/notifications/[id]/read`)", async () => {
      const notif = await sendNotification({ userId: "user_test_1", type: "COMMENT", title: "C1", body: "B1" })
      const req = new NextRequest(`http://localhost:3000/api/notifications/${notif?.id}/read`, { method: "POST" })

      const res = await markNotificationRead(req, { params: { notificationId: notif!.id } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.notification.readAt).toBeDefined()
    })

    it("should mark all notifications as read (`POST /api/notifications/read-all`)", async () => {
      await sendNotification({ userId: "user_test_1", type: "COMMENT", title: "C1", body: "B1" })
      await sendNotification({ userId: "user_test_1", type: "MENTION", title: "M1", body: "B2" })

      const res = await markAllNotificationsRead()
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.updatedCount).toBe(2)
    })
  })

  describe("Inline Deliverable Comments & Resolve API", () => {
    it("should post a new comment and trigger @mention notifications", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase10/deliverables/deliv_phase10/comments", {
        method: "POST",
        body: JSON.stringify({ body: "Please review hero headline @Bob" })
      })

      const res = await postComment(req, { params: { projectId: "proj_phase10", type: "deliv_phase10" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.comment.body).toBe("Please review hero headline @Bob")
      expect(mockCommentsStore.length).toBe(1)
      expect(mockActivityLogsStore.some((a) => a.action === "comment_added")).toBe(true)
    })

    it("should fetch comments for a deliverable (`GET /api/.../comments`)", async () => {
      const reqPost = new NextRequest("http://localhost:3000/api/projects/proj_phase10/deliverables/deliv_phase10/comments", {
        method: "POST",
        body: JSON.stringify({ body: "Test comment 1" })
      })
      await postComment(reqPost, { params: { projectId: "proj_phase10", type: "deliv_phase10" } })

      const reqGet = new NextRequest("http://localhost:3000/api/projects/proj_phase10/deliverables/deliv_phase10/comments")
      const res = await getComments(reqGet, { params: { projectId: "proj_phase10", type: "deliv_phase10" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.comments.length).toBe(1)
    })

    it("should toggle resolution status on a comment (`POST /api/.../resolve`)", async () => {
      const reqPost = new NextRequest("http://localhost:3000/api/projects/proj_phase10/deliverables/deliv_phase10/comments", {
        method: "POST",
        body: JSON.stringify({ body: "Resolve me" })
      })
      const postRes = await postComment(reqPost, { params: { projectId: "proj_phase10", type: "deliv_phase10" } })
      const postBody = await postRes.json()

      const reqResolve = new NextRequest(`http://localhost:3000/api/projects/proj_phase10/comments/${postBody.comment.id}/resolve`, {
        method: "POST"
      })
      const res = await resolveComment(reqResolve, { params: { projectId: "proj_phase10", commentId: postBody.comment.id } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.comment.resolved).toBe(true)
    })
  })

  describe("Project Activity Log Feed API", () => {
    it("should return activity logs for the project (`GET /api/projects/[projectId]/activity`)", async () => {
      mockActivityLogsStore.push({
        id: "act_1",
        projectId: "proj_phase10",
        actorId: "user_test_1",
        action: "blueprint_approved",
        entity: "BLUEPRINT",
        entityId: "bp_1",
        createdAt: new Date(),
        actor: mockUsersStore[0]
      })

      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase10/activity")
      const res = await getActivityLogs(req, { params: { projectId: "proj_phase10" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.activities.length).toBe(1)
      expect(body.activities[0].action).toBe("blueprint_approved")
    })

    it("should reject unauthorized project activity access with 403 Forbidden", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/unauthorized/activity")
      const res = await getActivityLogs(req, { params: { projectId: "unauthorized" } })
      const body = await res.json()

      expect(res.status).toBe(403)
      expect(body.error).toBe("Access Denied")
    })
  })
})
