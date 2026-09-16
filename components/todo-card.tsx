"use client"

import type React from "react"
import { useState, useTransition } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { addTodo, toggleTodo, deleteTodo } from "@/app/actions/todos"
import type { TodoRow } from "@/lib/db/schema"
import { Plus, Trash2, Check } from "lucide-react"

export function TodoCard({ todos, className }: { todos: TodoRow[]; className?: string }) {
  const [items, setItems] = useState<TodoRow[]>(todos)
  const [value, setValue] = useState("")
  const [, startTransition] = useTransition()

  function add() {
    const title = value.trim()
    if (!title) return
    const optimistic: TodoRow = {
      id: Date.now(),
      title,
      done: false,
      position: 0,
      createdAt: new Date(),
    }
    setItems((prev) => [...prev, optimistic])
    setValue("")
    startTransition(() => {
      addTodo(title)
    })
  }

  function toggle(id: number, done: boolean) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)))
    startTransition(() => {
      toggleTodo(id, done)
    })
  }

  function remove(id: number) {
    setItems((prev) => prev.filter((t) => t.id !== id))
    startTransition(() => {
      deleteTodo(id)
    })
  }

  const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done))
  const remaining = items.filter((t) => !t.done).length

  return (
    <Card className={`p-6 bg-card border border-border rounded-2xl shadow-none flex flex-col ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-card-foreground font-sans">Att göra</h3>
        <span className="text-xs text-muted-foreground font-sans">{remaining} kvar</span>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) add()
          }}
          placeholder="Lägg till en uppgift…"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm font-sans outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="icon" className="rounded-full shrink-0" onClick={add} aria-label="Lägg till uppgift">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <ul className="space-y-2 flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <li className="text-sm text-muted-foreground font-sans">Inga uppgifter ännu</li>
        )}
        {sorted.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/50 px-3 py-2">
            <button
              onClick={() => toggle(t.id, !t.done)}
              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                t.done ? "bg-primary border-primary text-primary-foreground" : "border-border"
              }`}
              aria-label={t.done ? "Markera som ej klar" : "Markera som klar"}
            >
              {t.done && <Check className="w-3 h-3" />}
            </button>
            <span
              className={`text-sm font-sans flex-1 ${
                t.done ? "line-through text-muted-foreground" : "text-card-foreground"
              }`}
            >
              {t.title}
            </span>
            <button
              onClick={() => remove(t.id)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Ta bort uppgift"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
