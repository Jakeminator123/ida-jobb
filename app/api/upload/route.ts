import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { extractDocumentText } from "@/lib/text-extract"

const ALLOWED_CATEGORIES = new Set(["cv", "cover_letter", "upload", "agent_material"])
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const category = String(formData.get("category") || "")
    const uploader = String(formData.get("uploader") || "ida")

    if (!file) {
      return NextResponse.json({ error: "Ingen fil bifogad" }, { status: 400 })
    }
    if (!ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Ogiltig kategori" }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Filen är för stor (max 20 MB)" }, { status: 400 })
    }

    const key = `${category}/${Date.now()}-${file.name}`
    const blob = await put(key, file, { access: "private", addRandomSuffix: true })

    // Extract text so the AI brain can read the full document contents.
    const extractedText = await extractDocumentText(file, file.type || null)

    const [row] = await db
      .insert(files)
      .values({
        category,
        uploader: uploader === "agent" ? "agent" : "ida",
        filename: file.name,
        pathname: blob.pathname,
        contentType: file.type || null,
        size: file.size,
        extractedText,
      })
      .returning()

    return NextResponse.json({ file: row })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: "Uppladdningen misslyckades" }, { status: 500 })
  }
}
