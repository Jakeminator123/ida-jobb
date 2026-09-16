import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { GROKBOT_CALLBACK_PATH, isGrokBotCallbackPath } from "./password-gate.ts"

describe("isGrokBotCallbackPath", () => {
  it("släpper endast den exakta callback-pathen", () => {
    assert.equal(isGrokBotCallbackPath(GROKBOT_CALLBACK_PATH), true)
    assert.equal(isGrokBotCallbackPath("/api/chat"), false)
    assert.equal(isGrokBotCallbackPath("/api/chat/callback/extra"), false)
    assert.equal(isGrokBotCallbackPath("/login"), false)
    assert.equal(isGrokBotCallbackPath("/api/login"), false)
  })
})
