import { type NextRequest, NextResponse } from "next/server"
import { COOKIE_NAME, COOKIE_VALUE, isLoginPath, siteGateEnabled } from "@/lib/auth-gate"

export function middleware(request: NextRequest) {
  if (!siteGateEnabled()) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  const isAuthed = request.cookies.get(COOKIE_NAME)?.value === COOKIE_VALUE

  if (isLoginPath(pathname)) {
    if (isAuthed) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (isAuthed) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
}
