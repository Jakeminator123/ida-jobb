import { get } from "@vercel/blob"
import mammoth from "mammoth"
import { extractText } from "unpdf"
import type { FileRow } from "./db/schema"

export const MAX_DOCS = 5
export const MAX_CHARS_PER_DOC = 8_000
export const MAX_EXTRACTED_CHARS = 24_000

const CATEGORY_RANK: Record<string, number> = {
  cv: 0,
  cover_letter: 1,
  upload: 2,
  agent_material: 3,
}

export function pickDocumentsForExtract(docs: FileRow[]): FileRow[] {
  return [...docs]
    .sort((a, b) => {
      const rank = (CATEGORY_RANK[a.category] ?? 9) - (CATEGORY_RANK[b.category] ?? 9)
      if (rank !== 0) return rank
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
    .slice(0, MAX_DOCS)
}

export function boundExtractedText(
  parts: { filename: string; category: string; text: string }[],
): string {
  if (parts.length === 0) return ""

  const chunks: string[] = []
  let used = 0

  for (const part of parts) {
    const cleaned = part.text.replace(/\s+/g, " ").trim()
    if (!cleaned) continue
    const body = cleaned.slice(0, MAX_CHARS_PER_DOC)
    const header = `--- ${part.filename} (${part.category}) ---\n`
    const separator = chunks.length > 0 ? 2 : 0
    const remaining = MAX_EXTRACTED_CHARS - used - separator
    if (remaining <= header.length) break
    const piece = `${header}${body}`.slice(0, remaining)
    chunks.push(piece)
    used += separator + piece.length
    if (used >= MAX_EXTRACTED_CHARS) break
  }

  return chunks.join("\n\n").slice(0, MAX_EXTRACTED_CHARS)
}

async function bufferFromBlob(pathname: string): Promise<Buffer | null> {
  const result = await get(pathname, { access: "private" })
  if (!result?.stream) return null
  const bytes = await new Response(result.stream).arrayBuffer()
  return Buffer.from(bytes)
}

async function extractFromBuffer(
  filename: string,
  contentType: string | null,
  buffer: Buffer,
): Promise<string> {
  const lower = filename.toLowerCase()
  const type = (contentType || "").toLowerCase()

  if (type.includes("text/plain") || lower.endsWith(".txt") || lower.endsWith(".md")) {
    return buffer.toString("utf8")
  }

  if (type.includes("pdf") || lower.endsWith(".pdf")) {
    const extracted = await extractText(new Uint8Array(buffer), { mergePages: true })
    return Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text
  }

  if (
    type.includes("wordprocessingml") ||
    type.includes("msword") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc")
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ""
  }

  return ""
}

export async function collectExtractedText(docs: FileRow[]): Promise<string> {
  const selected = pickDocumentsForExtract(docs)
  const parts: { filename: string; category: string; text: string }[] = []

  for (const doc of selected) {
    const stored = doc.extractedText?.trim()
    if (stored) {
      parts.push({ filename: doc.filename, category: doc.category, text: stored })
      continue
    }

    try {
      const buffer = await bufferFromBlob(doc.pathname)
      if (!buffer) continue
      const text = await extractFromBuffer(doc.filename, doc.contentType, buffer)
      if (text.trim()) {
        parts.push({ filename: doc.filename, category: doc.category, text })
      }
    } catch (error) {
      console.error("[v0] Document extract failed:", doc.filename, error)
    }
  }

  return boundExtractedText(parts)
}
