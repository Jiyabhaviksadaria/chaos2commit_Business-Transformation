"use client"

import * as React from "react"
import { RequirementsOutput } from "@/modules/deliverables/requirements"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function RequirementsRenderer(content: unknown) {
  const req = content as Partial<RequirementsOutput>

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "HIGH": return "bg-red-500/10 text-red-500 hover:bg-red-500/20"
      case "MEDIUM": return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
      case "LOW": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
      default: return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-muted-foreground">
          {req?.executiveSummary || "No executive summary provided."}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Business Requirements</h3>
        {(!req?.businessRequirements || req.businessRequirements.length === 0) ? (
          <p className="text-muted-foreground italic">No business requirements listed.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {req.businessRequirements.map(br => (
              <Card key={br.id} className="flex flex-col h-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-mono text-muted-foreground">{br.id}</span>
                    <Badge variant="outline" className={getPriorityColor(br.priority)}>{br.priority}</Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight mt-2">{br.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 text-sm text-muted-foreground">
                  {br.description}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">User Stories</h3>
        {(!req?.userStories || req.userStories.length === 0) ? (
          <p className="text-muted-foreground italic">No user stories created yet.</p>
        ) : (
          <div className="space-y-3">
            {req.userStories.map(story => (
              <Card key={story.id}>
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-16 font-mono text-sm text-muted-foreground font-semibold">{story.id}</div>
                  <div className="flex-1 text-sm">
                    <strong>As a</strong> <span className="text-primary">{story.asA}</span>,{" "}
                    <strong>I want to</strong> <span className="text-primary">{story.iWantTo}</span>{" "}
                    <strong>so that</strong> <span className="text-primary">{story.soThat}</span>.
                  </div>
                  {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
                    <div className="md:w-[350px] text-xs space-y-1">
                      <div className="font-semibold text-muted-foreground mb-1">Acceptance:</div>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {story.acceptanceCriteria.map((ac, idx) => (
                          <li key={idx} className="text-muted-foreground">{ac}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
