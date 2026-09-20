import Link from "next/link";
import { Bot, FolderKanban } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-[#F7F4EB] font-sans">
      <div className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[32px] p-10 max-w-md w-full shadow-lg space-y-6">
        <div className="h-14 w-14 rounded-full bg-[#F8B4D9] text-neutral-900 flex items-center justify-center mx-auto shadow">
          <Bot className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">404 - Page Not Found</h2>
          <p className="mt-2 text-xs text-neutral-500">Could not find requested resource or page.</p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link href="/app/ai">
            <button className="w-full bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold py-3 rounded-full shadow transition-all flex items-center justify-center gap-2">
              <Bot className="h-4 w-4 text-[#F472B6]" />
              <span>Go to AI Assistant</span>
            </button>
          </Link>

          <Link href="/projects">
            <button className="w-full bg-white hover:bg-neutral-50 border border-[#E5DFD4] text-neutral-800 text-xs font-bold py-3 rounded-full shadow-sm transition-all flex items-center justify-center gap-2">
              <FolderKanban className="h-4 w-4 text-neutral-700" />
              <span>Return to Projects Dashboard</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
