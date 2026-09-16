"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ChatMessageRow } from "@/lib/db/schema"
import { DidAgent } from "@/components/did-agent"
import { Send, Loader2, Sparkles, Video, ExternalLink } from "lucide-react"

const FALLBACK_DID_AGENT_URL =
  "https://studio.d-id.com/agents/share?id=v2_agt_jcdow0ej&utm_source=copy&key=Y2tfOGdTQ21QQ2VDT05wV18xQzN4TG9Q"

type Message = { role: "user" | "assistant"; content: string }

export function DiChatCard({
  history,
  agentUrl,
  className,
}: {
  history: ChatMessageRow[]
  agentUrl?: string
  className?: string
}) {
  const didAgentUrl = agentUrl || FALLBACK_DID_AGENT_URL
  const [messages, setMessages] = useState<Message[]>(
    history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
  )
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<"brain" | "video">("video")
  const [videoOpened, setVideoOpened] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  function openVideo() {
    setVideoOpened(true)
    setTab("video")
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error || "Något gick fel. Försök igen." },
        ])
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Kunde inte nå assistenten." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={`bg-card border border-border rounded-2xl shadow-none flex flex-col overflow-hidden ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3 p-6 pb-4 border-b border-border">
        <div>
          <h3 className="font-bold text-card-foreground font-sans flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            DI-chatt
          </h3>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            Hjärnan förbereder svaren – videoagenten presenterar dem
          </p>
        </div>
        <div className="flex rounded-full border border-border p-1 bg-background/50 shrink-0">
          <button
            onClick={() => setTab("brain")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-sans transition-colors ${
              tab === "brain" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Hjärnan
          </button>
          <button
            onClick={openVideo}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-sans transition-colors ${
              tab === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Video
          </button>
        </div>
      </div>

      {tab === "brain" ? (
        <div className="flex flex-col flex-1 min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground font-sans">
                Hej Ida! Jag är hjärnan bakom din videoagent. Fråga mig om CV, personligt brev,
                intervjufrågor eller hur du ska formulera dig – så förbereder jag svaren.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-sans whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border border-border text-card-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2.5 bg-background border border-border">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 p-4 border-t border-border">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Skriv till hjärnan…"
              className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-sans outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="icon" className="rounded-full shrink-0" onClick={send} disabled={loading} aria-label="Skicka">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      ) : null}

      {videoOpened && (
        <div className={`${tab === "video" ? "flex" : "hidden"} flex-col flex-1 min-h-0 p-4 gap-3`}>
          <div className="relative flex-1 min-h-[360px] rounded-xl border border-border bg-background overflow-hidden">
            <DidAgent className="absolute inset-0 h-full w-full" />
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground self-center">
            <a href={didAgentUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
              Öppna i eget fönster
            </a>
          </Button>
        </div>
      )}
    </Card>
  )
}
