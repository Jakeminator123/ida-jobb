import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"
import { desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { chatMessages, files } from "@/lib/db/schema"
import {
  HJARNAN_SYSTEM_PROMPT,
  buildDocumentContext,
  chatErrorMessage,
  grokModel,
} from "@/lib/hjarnan"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { message } = (await request.json()) as { message?: string }
    const text = (message || "").trim()
    if (!text) {
      return NextResponse.json({ error: "Tomt meddelande" }, { status: 400 })
    }

    const [historyDesc, docs] = await Promise.all([
      db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt)).limit(20),
      db.select().from(files).orderBy(desc(files.createdAt)).limit(30),
    ])
    const history = historyDesc.reverse()
    const documentContext = await buildDocumentContext(docs)

    const { text: reply } = await generateText({
      model: grokModel(),
      system: `${HJARNAN_SYSTEM_PROMPT}\n\n${documentContext}`,
      messages: [
        ...history.map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        })),
        { role: "user" as const, content: text },
      ],
    })

    await db.insert(chatMessages).values([
      { role: "user", content: text },
      { role: "assistant", content: reply },
    ])

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("[v0] Chat error:", error)
    const mapped = chatErrorMessage(error)
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }
}
