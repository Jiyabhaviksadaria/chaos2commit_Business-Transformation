import { NextIntlClientProvider } from "next-intl"
import { getMessages, getLocale } from "next-intl/server"

import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const messages = await getMessages()
  const locale = await getLocale()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar */}
          <aside className="hidden h-screen w-64 flex-col fixed inset-y-0 z-20 sm:flex">
            <Sidebar />
          </aside>
          
          <div className="flex flex-1 flex-col sm:pl-64">
            <Topbar locale={locale} />
            <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 overflow-y-auto">
              {/* Mobile Advisory banner */}
              <div className="w-full flex lg:hidden items-center justify-center my-4 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg text-center">
                AI-generated recommendations are advisory and should be validated before implementation.
              </div>
              {children}
            </main>
          </div>
        </div>
      </div>
    </NextIntlClientProvider>
  )
}
