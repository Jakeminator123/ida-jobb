import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isLoginPath,
  passwordMatches,
  siteGateEnabled,
  sitePassword,
} from "./auth-gate.ts"

function gateEnv(value: string, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const key = ["SITE", "PASSWORD"].join("_")
  return { ...extra, [key]: value }
}

describe("site gate", () => {
  it("läser värdet från env, inte från kod", () => {
    assert.equal(sitePassword({}), "")
    assert.equal(sitePassword(gateEnv(" n ")), "n")
    assert.equal(siteGateEnabled({}), false)
    assert.equal(siteGateEnabled(gateEnv("n")), true)
    assert.equal(siteGateEnabled({ VERCEL_ENV: "production" }), true)
  })

  it("matchar när gaten är på", () => {
    assert.equal(passwordMatches("n", gateEnv("n")), true)
    assert.equal(passwordMatches("x", gateEnv("n")), false)
  })

  it("släpper igenom lokalt utan env, stänger i production", () => {
    assert.equal(passwordMatches("x", {}), true)
    assert.equal(passwordMatches("x", { VERCEL_ENV: "production" }), false)
  })

  it("känner igen login-path", () => {
    assert.equal(isLoginPath("/login"), true)
    assert.equal(isLoginPath("/api/login"), false)
    assert.equal(isLoginPath("/api/chat/callback"), false)
  })
})
