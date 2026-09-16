import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { AUTH_COOKIE, isGrokBotCallbackPath, siteAuthToken } from "@/lib/password-gate"

/**
 * Grok Bot POSTar till /api/chat/callback utan Idas cookie.
 * Den pathen måste släppas igenom lösenordsskyddet; auth sköts av GROKBOT_CALLBACK_SECRET.
 */
export async function middleware(request: NextRequest) {
  if (isGrokBotCallbackPath(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const password = process.env.SITE_PASSWORD?.trim()
  if (!password) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next()
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value
  if (cookie && cookie === (await siteAuthToken(password))) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Obehörig" }, { status: 401 })
  }

  const login = request.nextUrl.clone()
  login.pathname = "/login"
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
