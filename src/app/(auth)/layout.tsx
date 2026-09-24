import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col items-center justify-center bg-[#F7F4EB] px-4 py-10"><div className="w-full max-w-5xl"><div className="mb-8 text-center"><Link href="/" className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight text-neutral-900"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18181C] px-1 text-[10px] font-black tracking-tight text-white">Intelly</span><span>Intelly <span className="font-normal text-neutral-500">AI</span></span></Link><p className="mt-3 text-xs text-neutral-500">Secure access to your transformation workspace</p></div><div className="flex justify-center">{children}</div><p className="mt-8 text-center text-xs text-neutral-400">By continuing, you agree to use this workspace responsibly.</p></div></main>
}
