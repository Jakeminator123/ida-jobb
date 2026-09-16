import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  CALLBACK_SECRET_HEADER,
  HJARNAN_INSTRUCTIONS,
  WEBHOOK_AUTH_HEADER,
  buildReplyUrl,
  buildWebhookPayload,
  callbackAuthorized,
  extractBearerToken,
  grokBotWebhookHeaders,
  isUniqueViolation,
  parseCallbackBody,
  readGrokBotConfig,
  timingSafeEqualString,
} from "./grokbot.ts"

describe("readGrokBotConfig", () => {
  it("kräver alla tre env-variabler", () => {
    const result = readGrokBotConfig({})
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.match(result.error, /GROKBOT_WEBHOOK_URL/)
      assert.match(result.error, /GROKBOT_WEBHOOK_KEY/)
      assert.match(result.error, /GROKBOT_CALLBACK_SECRET/)
    }
  })

  it("accepterar ifyllda värden", () => {
    const result = readGrokBotConfig({
      GROKBOT_WEBHOOK_URL: "https://example.com/hook",
      GROKBOT_WEBHOOK_KEY: "crsr_test",
      GROKBOT_CALLBACK_SECRET: "cb_secret",
    })
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.config.webhookUrl, "https://example.com/hook")
      assert.equal(result.config.webhookKey, "crsr_test")
      assert.equal(result.config.callbackSecret, "cb_secret")
    }
  })
})

describe("grokBotWebhookHeaders", () => {
  it("skickar Authorization: Bearer <key>", () => {
    const headers = grokBotWebhookHeaders("crsr_abc")
    assert.equal(headers[WEBHOOK_AUTH_HEADER], "Bearer crsr_abc")
    assert.equal(headers["Content-Type"], "application/json")
  })

  it("dubbelprefixar inte Bearer", () => {
    const headers = grokBotWebhookHeaders("Bearer crsr_abc")
    assert.equal(headers[WEBHOOK_AUTH_HEADER], "Bearer crsr_abc")
  })
})

describe("callbackAuthorized", () => {
  it("godkänner Bearer-token", () => {
    const headers = new Headers({ authorization: "Bearer super-secret" })
    assert.equal(callbackAuthorized(headers, "super-secret"), true)
  })

  it("godkänner x-grokbot-callback-secret", () => {
    const headers = new Headers({ [CALLBACK_SECRET_HEADER]: "super-secret" })
    assert.equal(callbackAuthorized(headers, "super-secret"), true)
  })

  it("nekar fel hemlighet", () => {
    const headers = new Headers({ authorization: "Bearer wrong" })
    assert.equal(callbackAuthorized(headers, "super-secret"), false)
  })

  it("nekar saknad header", () => {
    assert.equal(callbackAuthorized(new Headers(), "super-secret"), false)
  })

  it("nekar tom secret", () => {
    const headers = new Headers({ authorization: "Bearer x" })
    assert.equal(callbackAuthorized(headers, ""), false)
  })
})

describe("timingSafeEqualString / extractBearerToken", () => {
  it("jämför lika och olika strängar", () => {
    assert.equal(timingSafeEqualString("abc", "abc"), true)
    assert.equal(timingSafeEqualString("abc", "abd"), false)
    assert.equal(timingSafeEqualString("abc", "ab"), false)
  })

  it("plockar ut Bearer-token", () => {
    assert.equal(extractBearerToken("Bearer token-1"), "token-1")
    assert.equal(extractBearerToken("bearer token-1"), "token-1")
    assert.equal(extractBearerToken("Basic x"), null)
    assert.equal(extractBearerToken(null), null)
  })
})

describe("buildReplyUrl / payload / callback body", () => {
  it("använder APP_URL när den finns", () => {
    const request = new Request("https://ignored.example/api/chat")
    assert.equal(
      buildReplyUrl(request, { APP_URL: "https://ida.example/" }),
      "https://ida.example/api/chat/callback",
    )
  })

  it("bygger URL från request-host", () => {
    const request = new Request("https://app.example/api/chat", {
      headers: { host: "app.example", "x-forwarded-proto": "https" },
    })
    assert.equal(buildReplyUrl(request, {}), "https://app.example/api/chat/callback")
  })

  it("bygger webhook-payload med kontraktfält", () => {
    const payload = buildWebhookPayload({
      requestId: "req-1",
      message: "Hej",
      replyUrl: "https://app.example/api/chat/callback",
      history: [{ role: "assistant", content: "Tidigare" }],
      documentSummary: "Inga dokument är uppladdade än.",
      extractedText: "--- cv.pdf (cv) ---\nIda Andersson",
    })
    assert.equal(payload.source, "ida-jobb")
    assert.equal(payload.request_id, "req-1")
    assert.equal(payload.message, "Hej")
    assert.equal(payload.reply_url, "https://app.example/api/chat/callback")
    assert.deepEqual(payload.history, [{ role: "assistant", content: "Tidigare" }])
    assert.equal(payload.document_summary, "Inga dokument är uppladdade än.")
    assert.equal(payload.extracted_text, "--- cv.pdf (cv) ---\nIda Andersson")
    assert.equal(payload.instructions, HJARNAN_INSTRUCTIONS)
  })

  it("parsar officiellt callback-kontrakt", () => {
    const parsed = parseCallbackBody({ request_id: " req-1 ", reply: " Hej Ida " })
    assert.deepEqual(parsed, { ok: true, request_id: "req-1", reply: "Hej Ida" })
  })

  it("accepterar text som alias för reply", () => {
    const parsed = parseCallbackBody({ request_id: "req-1", text: "Alias" })
    assert.equal(parsed.ok, true)
    if (parsed.ok) assert.equal(parsed.reply, "Alias")
  })

  it("avvisar tom reply", () => {
    const parsed = parseCallbackBody({ request_id: "req-1", reply: "   " })
    assert.equal(parsed.ok, false)
  })
})

describe("isUniqueViolation", () => {
  it("känner igen Postgres 23505", () => {
    assert.equal(isUniqueViolation({ code: "23505" }), true)
    assert.equal(isUniqueViolation({ cause: { code: "23505" } }), true)
    assert.equal(isUniqueViolation({ code: "23503" }), false)
  })
})
