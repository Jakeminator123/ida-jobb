import { type NextRequest, NextResponse } from "next/server"
import { COOKIE_NAME, COOKIE_VALUE } from "@/lib/auth-gate"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthed = request.cookies.get(COOKIE_NAME)?.value === COOKIE_VALUE

  if (!isAuthed && pathname !== "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isAuthed && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
}
