import { randomUUID } from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { ensureChatSchema } from "@/lib/db/ensure"
import { chatMessages, files } from "@/lib/db/schema"
import {
  buildReplyUrl,
  buildWebhookPayload,
  postGrokBotWebhook,
  readGrokBotConfig,
} from "@/lib/grokbot"

function documentSummary(
  docs: { filename: string; category: string; uploader: string }[],
): string {
  if (docs.length === 0) return "Inga dokument är uppladdade än."
  return (
    "Uppladdade dokument just nu: " +
    docs.map((d) => `${d.filename} (${d.category}, av ${d.uploader})`).join("; ")
  )
}

export async function POST(request: NextRequest) {
  try {
    const configured = readGrokBotConfig()
    if (!configured.ok) {
      return NextResponse.json({ error: configured.error }, { status: 503 })
    }

    const { message } = (await request.json()) as { message?: string }
    const text = (message || "").trim()
    if (!text) {
      return NextResponse.json({ error: "Tomt meddelande" }, { status: 400 })
    }

    await ensureChatSchema()

    const [historyDesc, docs] = await Promise.all([
      db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt)).limit(20),
      db.select().from(files).orderBy(desc(files.createdAt)).limit(30),
    ])
    const history = historyDesc.reverse()

    const requestId = randomUUID()
    await db.insert(chatMessages).values({
      role: "user",
      content: text,
      requestId,
    })

    const payload = buildWebhookPayload({
      requestId,
      message: text,
      replyUrl: buildReplyUrl(request),
      history: history.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
      documentSummary: documentSummary(docs),
    })

    let webhookRes: Response
    try {
      webhookRes = await postGrokBotWebhook(
        configured.config.webhookUrl,
        configured.config.webhookKey,
        payload,
      )
    } catch (error) {
      console.error("[v0] Grok Bot webhook network error:", error)
      return NextResponse.json(
        { error: "Kunde inte nå Grok Bot-webhooken.", request_id: requestId },
        { status: 502 },
      )
    }

    if (!webhookRes.ok) {
      console.error("[v0] Grok Bot webhook status:", webhookRes.status)
      return NextResponse.json(
        {
          error: `Assistenten kunde inte startas (webhook ${webhookRes.status}). Kontrollera Grok Bot-rutinen.`,
          request_id: requestId,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ status: "pending", request_id: requestId })
  } catch (error) {
    console.error("[v0] Chat error:", error)
    return NextResponse.json({ error: "Något gick fel med assistenten" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const requestId = request.nextUrl.searchParams.get("request_id")?.trim()
    if (!requestId) {
      return NextResponse.json({ error: "Saknar request_id" }, { status: 400 })
    }

    await ensureChatSchema()

    const [assistant] = await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.requestId, requestId), eq(chatMessages.role, "assistant")))
      .limit(1)

    if (assistant) {
      return NextResponse.json({
        status: "complete",
        request_id: requestId,
        reply: assistant.content,
      })
    }

    const [userRow] = await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.requestId, requestId), eq(chatMessages.role, "user")))
      .limit(1)

    if (!userRow) {
      return NextResponse.json({ error: "Okänd förfrågan" }, { status: 404 })
    }

    return NextResponse.json({ status: "pending", request_id: requestId })
  } catch (error) {
    console.error("[v0] Chat poll error:", error)
    return NextResponse.json({ error: "Kunde inte hämta status" }, { status: 500 })
  }
}
