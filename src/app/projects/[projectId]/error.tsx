"use client"

import { Button } from "@/components/ui/button"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm max-w-md">{error.message}</p>
      <Button onClick={reset} variant="outline">Try again</Button>
    </div>
  )
}
