import { type NextRequest, NextResponse } from "next/server"
import { AUTH_COOKIE, siteAuthToken } from "@/lib/password-gate"

export async function POST(request: NextRequest) {
  const expected = process.env.SITE_PASSWORD?.trim()
  if (!expected) {
    return NextResponse.json({ ok: true })
  }

  const { password } = (await request.json()) as { password?: string }
  if ((password || "").trim() !== expected) {
    return NextResponse.json({ error: "Fel lösenord" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE, await siteAuthToken(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
