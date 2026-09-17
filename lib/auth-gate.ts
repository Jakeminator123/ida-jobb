// Shared-password gate for Idas jobbsökarstudio.
// Password comes from SITE_PASSWORD — never commit the value.
export const COOKIE_NAME = "ida_studio_auth"
export const COOKIE_VALUE = "ida-authed-v1"

export function sitePassword(env: NodeJS.ProcessEnv = process.env): string {
  return env.SITE_PASSWORD?.trim() ?? ""
}

export function siteGateEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (sitePassword(env)) return true
  // Fail closed on Vercel production if SITE_PASSWORD is missing.
  return env.VERCEL_ENV === "production"
}

export function passwordMatches(input: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const expected = sitePassword(env)
  if (!expected) return env.VERCEL_ENV !== "production"
  return input.trim() === expected
}

export function isLoginPath(pathname: string): boolean {
  return pathname === "/login"
}
