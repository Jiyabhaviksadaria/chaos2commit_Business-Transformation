import * as React from "react"
import { VerifyEmailForm } from "./verify-email-form"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  return (
    <React.Suspense
      fallback={
        <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </CardContent>
        </Card>
      }
    >
      <VerifyEmailForm initialToken={searchParams.token || ""} />
    </React.Suspense>
  )
}
