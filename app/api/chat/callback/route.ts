import { type NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { ensureChatSchema } from "@/lib/db/ensure"
import { chatMessages } from "@/lib/db/schema"
import {
  callbackAuthorized,
  isUniqueViolation,
  parseCallbackBody,
  readGrokBotConfig,
} from "@/lib/grokbot"

export async function POST(request: NextRequest) {
  try {
    const configured = readGrokBotConfig()
    if (!configured.ok) {
      return NextResponse.json({ error: configured.error }, { status: 503 })
    }

    if (!callbackAuthorized(request.headers, configured.config.callbackSecret)) {
      return NextResponse.json({ error: "Obehörig" }, { status: 401 })
    }

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return NextResponse.json({ error: "Ogiltig JSON" }, { status: 400 })
    }

    const parsed = parseCallbackBody(raw)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    await ensureChatSchema()

    const [userRow] = await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.requestId, parsed.request_id), eq(chatMessages.role, "user")))
      .limit(1)

    if (!userRow) {
      return NextResponse.json({ error: "Okänd förfrågan" }, { status: 404 })
    }

    const [existing] = await db
      .select()
      .from(chatMessages)
      .where(
        and(eq(chatMessages.requestId, parsed.request_id), eq(chatMessages.role, "assistant")),
      )
      .limit(1)

    if (existing) {
      return NextResponse.json({
        status: "complete",
        request_id: parsed.request_id,
        duplicate: true,
      })
    }

    try {
      await db.insert(chatMessages).values({
        role: "assistant",
        content: parsed.reply,
        requestId: parsed.request_id,
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json({
          status: "complete",
          request_id: parsed.request_id,
          duplicate: true,
        })
      }
      throw error
    }

    return NextResponse.json({ status: "complete", request_id: parsed.request_id })
  } catch (error) {
    console.error("[v0] Chat callback error:", error)
    return NextResponse.json({ error: "Kunde inte spara svaret" }, { status: 500 })
  }
}
