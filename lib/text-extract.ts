import mammoth from "mammoth"
import { extractText, getDocumentProxy } from "unpdf"

const MAX_TEXT = 100_000

function clean(input: string): string | null {
  const text = (input || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  if (!text) return null
  return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text
}

/**
 * Extracts readable text from an uploaded document so the AI brain has full
 * read access to its contents. Supports PDF, .docx and plain text files.
 * Returns null when the format is unsupported or extraction fails.
 */
export async function extractDocumentText(file: File, contentType: string | null): Promise<string | null> {
  const name = file.name.toLowerCase()
  const type = (contentType || file.type || "").toLowerCase()

  try {
    if (type.includes("pdf") || name.endsWith(".pdf")) {
      const buffer = new Uint8Array(await file.arrayBuffer())
      const pdf = await getDocumentProxy(buffer)
      const { text } = await extractText(pdf, { mergePages: true })
      return clean(Array.isArray(text) ? text.join("\n") : text)
    }

    if (name.endsWith(".docx") || type.includes("wordprocessingml")) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const { value } = await mammoth.extractRawText({ buffer })
      return clean(value)
    }

    if (type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
      return clean(await file.text())
    }

    return null
  } catch (error) {
    console.error("[v0] Text extraction failed:", error)
    return null
  }
}
