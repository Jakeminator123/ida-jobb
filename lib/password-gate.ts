export const GROKBOT_CALLBACK_PATH = "/api/chat/callback"
export const AUTH_COOKIE = "ida-auth"

/** Endast den exakta callback-pathen — inte /api/chat eller underpaths. */
export function isGrokBotCallbackPath(pathname: string): boolean {
  return pathname === GROKBOT_CALLBACK_PATH
}

export async function siteAuthToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`ida-jobb:${password}`)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}
