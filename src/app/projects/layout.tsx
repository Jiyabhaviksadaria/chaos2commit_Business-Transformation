import { NextIntlClientProvider } from "next-intl"
import { getMessages, getLocale } from "next-intl/server"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export default async function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages()
  const locale = await getLocale()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex h-dvh min-h-0 w-full flex-col bg-[#F7F4EB]">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="hidden h-dvh w-64 flex-col fixed inset-y-0 z-20 lg:flex">
            <Sidebar />
          </aside>
          <div className="flex min-w-0 min-h-0 flex-1 flex-col lg:pl-64">
            <Topbar locale={locale} />
            <main className="workspace-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-12">
              {children}
            </main>
          </div>
        </div>
      </div>
    </NextIntlClientProvider>
  )
}
