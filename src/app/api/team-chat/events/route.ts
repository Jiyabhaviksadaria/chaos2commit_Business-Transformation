import { resolveUserWorkspace } from "@/lib/team-chat/access"
import { subscribeToWorkspaceEvents, TeamChatEvent } from "@/lib/team-chat/events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const requestedWorkspaceId = searchParams.get("workspaceId")

    const { workspace, user } = await resolveUserWorkspace(requestedWorkspaceId)

    const encoder = new TextEncoder()
    let cleanup: (() => void) | null = null
    let heartbeatTimer: NodeJS.Timeout | null = null
    let isClosed = false

    const stream = new ReadableStream({
      start(controller) {
        const safeEnqueue = (chunk: Uint8Array) => {
          if (!isClosed) {
            try {
              controller.enqueue(chunk)
            } catch {
              // Controller closed
              isClosed = true
            }
          }
        }

        // Send initial connected event
        safeEnqueue(
          encoder.encode(
            `event: connected\ndata: ${JSON.stringify({
              status: "connected",
              workspaceId: workspace.id,
              userId: user.id,
              timestamp: new Date().toISOString(),
            })}\n\n`
          )
        )

        // Subscribe to real-time events for this workspace & user
        const unsubscribe = subscribeToWorkspaceEvents(
          workspace.id,
          user.id,
          (event: TeamChatEvent) => {
            const data = JSON.stringify({
              type: event.type,
              conversationId: event.conversationId,
              ...event.payload,
            })
            safeEnqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`))
          }
        )

        // Heartbeat keep-alive every 20 seconds
        heartbeatTimer = setInterval(() => {
          safeEnqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
        }, 20000)

        cleanup = () => {
          if (isClosed) return
          isClosed = true
          if (heartbeatTimer) clearInterval(heartbeatTimer)
          unsubscribe()
        }

        req.signal.addEventListener("abort", () => {
          cleanup?.()
          try {
            controller.close()
          } catch {
            // Already closed
          }
        })
      },
      cancel() {
        cleanup?.()
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") {
      return new Response(JSON.stringify({ error: "Authentication required." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }
    if (error instanceof Error && error.name === "AccessError") {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }
    console.error("[GET /api/team-chat/events] Error:", error)
    return new Response(JSON.stringify({ error: "Unable to establish event stream." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
