import { NextIntlClientProvider } from "next-intl"
import { getMessages, getLocale } from "next-intl/server"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export default async function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages()
  const locale = await getLocale()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen w-full flex-col bg-[#F7F4EB]">
        <div className="flex flex-1 overflow-hidden">
          <aside className="hidden h-screen w-64 flex-col fixed inset-y-0 z-20 sm:flex">
            <Sidebar />
          </aside>
          <div className="flex flex-1 flex-col sm:pl-64">
            <Topbar locale={locale} />
            <main className="flex-1 overflow-y-auto pb-12">
              {children}
            </main>
          </div>
        </div>
      </div>
    </NextIntlClientProvider>
  )
}
