import { timingSafeEqual } from "crypto"

export const HJARNAN_INSTRUCTIONS = `Du är "Hjärnan" – en svensk jobbsöks-assistent och coach för Ida.
Du är lagret som tänker och förbereder innan något sägs vidare till videoagenten på sajten.

Ditt uppdrag:
- Hjälp Ida att söka jobb: skriv och förbättra CV och personliga brev, hitta styrkor, förbereda intervjuer och formulera svar.
- Var konkret, uppmuntrande och rak. Ge korta, användbara svar på svenska.
- När du föreslår text (t.ex. ett stycke till ett personligt brev), presentera det tydligt så Ida kan kopiera det.
- Om du saknar information, ställ en kort följdfråga istället för att gissa.
- Håll en varm, professionell ton.

När du är klar: POST:a svaret till reply_url som JSON { "request_id", "reply" } med Authorization: Bearer <GROKBOT_CALLBACK_SECRET>.`

export const WEBHOOK_AUTH_HEADER = "Authorization"
export const CALLBACK_SECRET_HEADER = "x-grokbot-callback-secret"
export const MAX_REPLY_LENGTH = 50_000
export const WEBHOOK_TIMEOUT_MS = 15_000

export type GrokBotConfig = {
  webhookUrl: string
  webhookKey: string
  callbackSecret: string
}

export type ChatHistoryItem = {
  role: "user" | "assistant"
  content: string
}

export type GrokBotWebhookPayload = {
  source: "ida-jobb"
  request_id: string
  message: string
  reply_url: string
  history: ChatHistoryItem[]
  document_summary: string
  instructions: string
}

export function readGrokBotConfig(
  env: NodeJS.ProcessEnv = process.env,
): { ok: true; config: GrokBotConfig } | { ok: false; error: string } {
  const webhookUrl = env.GROKBOT_WEBHOOK_URL?.trim() ?? ""
  const webhookKey = env.GROKBOT_WEBHOOK_KEY?.trim() ?? ""
  const callbackSecret = env.GROKBOT_CALLBACK_SECRET?.trim() ?? ""

  const missing: string[] = []
  if (!webhookUrl) missing.push("GROKBOT_WEBHOOK_URL")
  if (!webhookKey) missing.push("GROKBOT_WEBHOOK_KEY")
  if (!callbackSecret) missing.push("GROKBOT_CALLBACK_SECRET")

  if (missing.length > 0) {
    return {
      ok: false,
      error: `Grok Bot är inte konfigurerad. Saknar ${missing.join(", ")}.`,
    }
  }

  return { ok: true, config: { webhookUrl, webhookKey, callbackSecret } }
}

export function grokBotWebhookHeaders(key: string): Record<string, string> {
  const authorization = /^bearer\s+/i.test(key) ? key : `Bearer ${key}`
  return {
    [WEBHOOK_AUTH_HEADER]: authorization,
    "Content-Type": "application/json",
  }
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  const length = Math.max(left.length, right.length, 1)
  const leftPad = Buffer.alloc(length)
  const rightPad = Buffer.alloc(length)
  left.copy(leftPad)
  right.copy(rightPad)
  return timingSafeEqual(leftPad, rightPad) && left.length === right.length
}

export function extractBearerToken(header: string | null | undefined): string | null {
  if (!header) return null
  const match = header.match(/^Bearer\s+(\S.*)$/i)
  const token = match?.[1]?.trim()
  return token || null
}

export function callbackAuthorized(
  headers: Headers,
  secret: string,
): boolean {
  if (!secret) return false
  const bearer = extractBearerToken(headers.get("authorization"))
  const alt = headers.get(CALLBACK_SECRET_HEADER)?.trim() || null
  const bearerOk = bearer !== null && timingSafeEqualString(bearer, secret)
  const altOk = alt !== null && timingSafeEqualString(alt, secret)
  return bearerOk || altOk
}

export function buildReplyUrl(request: Request, env: NodeJS.ProcessEnv = process.env): string {
  const configured = (env.APP_URL || env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "")
  if (configured) return `${configured}/api/chat/callback`

  const incoming = new URL(request.url)
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || incoming.host
  const proto =
    request.headers.get("x-forwarded-proto") || incoming.protocol.replace(":", "") || "https"
  return `${proto}://${host}/api/chat/callback`
}

export function buildWebhookPayload(input: {
  requestId: string
  message: string
  replyUrl: string
  history: ChatHistoryItem[]
  documentSummary: string
}): GrokBotWebhookPayload {
  return {
    source: "ida-jobb",
    request_id: input.requestId,
    message: input.message,
    reply_url: input.replyUrl,
    history: input.history,
    document_summary: input.documentSummary,
    instructions: HJARNAN_INSTRUCTIONS,
  }
}

export function parseCallbackBody(
  body: unknown,
): { ok: true; request_id: string; reply: string } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Ogiltig JSON" }
  }

  const record = body as Record<string, unknown>
  const requestId = typeof record.request_id === "string" ? record.request_id.trim() : ""
  const replyRaw = record.reply ?? record.text ?? record.content
  const reply = typeof replyRaw === "string" ? replyRaw.trim() : ""

  if (!requestId) return { ok: false, error: "Saknar request_id" }
  if (!reply) return { ok: false, error: "Saknar reply" }
  if (reply.length > MAX_REPLY_LENGTH) return { ok: false, error: "Svaret är för långt" }

  return { ok: true, request_id: requestId, reply }
}

export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const code = "code" in error ? String(error.code) : ""
  const cause = "cause" in error ? error.cause : null
  const causeCode =
    cause && typeof cause === "object" && "code" in cause ? String(cause.code) : ""
  return code === "23505" || causeCode === "23505"
}

export async function postGrokBotWebhook(
  url: string,
  key: string,
  payload: unknown,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: grokBotWebhookHeaders(key),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  })
}
