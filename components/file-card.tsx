"use client"

import type React from "react"
import { useRef, useState, useTransition } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { deleteFile } from "@/app/actions/files"
import type { FileRow } from "@/lib/db/schema"
import { Upload, Download, Trash2, FileText, Loader2 } from "lucide-react"

type FileCardProps = {
  title: string
  description: string
  category: "cv" | "cover_letter" | "upload" | "agent_material"
  uploader?: "ida" | "agent"
  files: FileRow[]
  className?: string
  accept?: string
  emptyLabel?: string
}

export function FileCard({
  title,
  description,
  category,
  uploader = "ida",
  files,
  className,
  accept,
  emptyLabel = "Inga filer ännu",
}: FileCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<FileRow[]>(files)
  const [isPending, startTransition] = useTransition()

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setError(null)
    setUploading(true)
    try {
      for (const file of Array.from(fileList)) {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("category", category)
        fd.append("uploader", uploader)
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Uppladdningen misslyckades")
          continue
        }
        setItems((prev) => [data.file as FileRow, ...prev])
      }
    } catch {
      setError("Uppladdningen misslyckades")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function handleDelete(id: number) {
    setItems((prev) => prev.filter((f) => f.id !== id))
    startTransition(() => {
      deleteFile(id)
    })
  }

  return (
    <Card className={`bento-card p-6 bg-card border border-border rounded-2xl flex flex-col ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-bold text-card-foreground font-sans">{title}</h3>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full bg-transparent shrink-0"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="ml-2">Ladda upp</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground font-sans mb-4">{description}</p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-destructive mb-3 font-sans">{error}</p>}

      <ul className="space-y-2 flex-1 overflow-y-auto">
        {items.length === 0 && <li className="text-sm text-muted-foreground font-sans">{emptyLabel}</li>}
        {items.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-background/50 px-3 py-2"
          >
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-card-foreground font-sans truncate flex-1" title={f.filename}>
              {f.filename}
            </span>
            <a
              href={`/api/file?pathname=${encodeURIComponent(f.pathname)}&download=1`}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Ladda ner ${f.filename}`}
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={() => handleDelete(f.id)}
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label={`Ta bort ${f.filename}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
