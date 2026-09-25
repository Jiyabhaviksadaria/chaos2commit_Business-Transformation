import { Metadata } from "next"
import { TeamChatShell } from "@/components/team-chat/team-chat-shell"

export const metadata: Metadata = {
  title: "Team Chat | Intelly Collaboration",
  description: "Real-time enterprise team collaboration, department channels, and direct messaging.",
}

export default function TeamChatPage() {
  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto h-[calc(100dvh-4.5rem)] flex flex-col">
      <TeamChatShell />
    </div>
  )
}
