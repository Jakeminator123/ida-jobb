"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error || "Fel lösenord")
        return
      }
      window.location.href = "/"
    } catch {
      setError("Kunde inte logga in")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold font-sans">Idas jobbsökarstudio</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Lösenord"
          className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm font-sans outline-none focus:ring-2 focus:ring-ring"
        />
        {error ? <p className="text-sm text-destructive font-sans">{error}</p> : null}
        <Button type="submit" className="rounded-full w-full" disabled={loading}>
          Logga in
        </Button>
      </form>
    </div>
  )
}
