"use client"

import React, { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Globe, Mic, Languages, ArrowRight, Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const STARTERS = [
  "HR Consultancy", "Clinic", "Retail Store", "School / Coaching", 
  "Logistics", "Restaurant", "Real Estate", "Startup (not sure)"
]

const LANGUAGES = [
  { val: "auto", label: "Auto (same as input)" },
  { val: "en", label: "English" },
  { val: "hi", label: "Hindi" },
  { val: "gu", label: "Gujarati" },
  { val: "es", label: "Spanish" },
  { val: "fr", label: "French" },
  { val: "de", label: "German" },
  { val: "pt", label: "Portuguese" },
  { val: "ar", label: "Arabic" },
  { val: "zh", label: "Chinese" },
  { val: "ja", label: "Japanese" }
]

export default function NewProjectScreen() {
  const router = useRouter()
  const [idea, setIdea] = useState("")
  const [projectName] = useState("")
  const [url, setUrl] = useState("")
  const [lang, setLang] = useState("auto")
  
  const [isRecording, setIsRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSpeechSupported(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as unknown as { SpeechRecognition: any; webkitSpeechRecognition: any }).SpeechRecognition || (window as unknown as { SpeechRecognition: any; webkitSpeechRecognition: any }).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setIdea(prev => prev + " " + finalTranscript)
        }
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onerror = (event: any) => {
        setIsRecording(false)
        console.error("Speech error", event)
      }
    }
  }, [])

  const toggleRecording = () => {
    if (!recognitionRef.current) return
    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      // Use standard BCP-47 tags
      recognitionRef.current.lang = lang === "auto" ? navigator.language : lang
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  const handleStarter = (text: string) => {
    setIdea(prev => (prev ? prev + "\n" : "") + "I am building a " + text + ".")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idea.trim() && !url.trim()) {
      toast.error("Please describe your idea or provide a URL/File.")
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Create project
      const name = projectName.trim() || (idea.substring(0, 30) || url).replace(/[^a-zA-Z0-9 ]/g, "") + " Project"
      const resProj = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          businessGoal: idea || "Analyze from ingestion.",
          language: lang,
          intakeUrl: url || undefined
        })
      })

      if (!resProj.ok) {
        const err = await resProj.json()
        throw new Error(err.error || "Failed to create project")
      }
      const project = await resProj.json()

      // 2. Add URL Intake if specified
      if (url.trim()) {
        const resUrl = await fetch("/api/intake/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, url: url.trim() })
        })
        if (!resUrl.ok) {
          const err = await resUrl.json()
          toast.warning("URL Import failed, but project was created: " + err.error)
        }
      }

      toast.success("Workspace initialized!")
      router.push(`/projects/${project.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error creating workspace")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tight">Launch Transformation</h1>
        <p className="text-muted-foreground mt-2">Describe your business, provide an existing website, or drop a document.</p>
      </div>

      <Card className="shadow-lg border-primary/20">
        <CardContent className="pt-6">
          <Tabs defaultValue="idea" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-auto">
              <TabsTrigger value="idea" className="py-3 flex flex-col sm:flex-row gap-2">
                <Sparkles className="w-4 h-4" /> Description & Idea
              </TabsTrigger>
              <TabsTrigger value="url" className="py-3 flex flex-col sm:flex-row gap-2">
                <Globe className="w-4 h-4" /> Website URL
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit}>
              <TabsContent value="idea" className="space-y-6">
                <div className="relative">
                  <Textarea 
                    className="min-h-[200px] text-base resize-none focus-visible:ring-primary/50 text-xl font-medium placeholder:font-normal p-4 pr-12"
                    placeholder="Describe your business or idea in any language..."
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                  />
                  {speechSupported && (
                    <Button 
                      type="button"
                      variant={isRecording ? "destructive" : "secondary"}
                      size="icon"
                      className="absolute bottom-4 right-4 rounded-full h-10 w-10 shadow-sm transition-all"
                      onClick={toggleRecording}
                      aria-label="Voice input"
                    >
                      <Mic className={`h-5 w-5 ${isRecording ? "animate-pulse" : ""}`} />
                    </Button>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-3 font-medium">Starter templates</p>
                  <div className="flex flex-wrap gap-2">
                    {STARTERS.map(t => (
                      <div 
                        key={t} 
                        onClick={() => handleStarter(t)}
                        className="px-3 py-1.5 bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-sm rounded-full cursor-pointer select-none border border-transparent hover:border-primary/20"
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-6">
                 <div className="space-y-3">
                  <h3 className="text-lg font-medium">Import existing system</h3>
                  <p className="text-sm text-muted-foreground">We will safely scrape the URL to extract your business architecture context.</p>
                  <Input 
                    type="url"
                    placeholder="https://your-company.com" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="text-base py-6"
                  />
                 </div>
              </TabsContent>

              <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                   <Languages className="w-5 h-5 text-muted-foreground" />
                   <Select value={lang} onValueChange={setLang}>
                    <SelectTrigger className="w-[200px] border-none bg-transparent shadow-none hover:bg-muted font-medium">
                      <SelectValue placeholder="Output Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => (
                        <SelectItem key={l.val} value={l.val}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                   </Select>
                </div>
                
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={isSubmitting} 
                  className="w-full sm:w-auto text-base px-8 h-12"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Initializing...</>
                  ) : (
                    <>Start Discovery <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
