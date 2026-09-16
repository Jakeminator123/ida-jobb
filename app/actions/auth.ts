"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { COOKIE_NAME, COOKIE_VALUE, SITE_PASSWORD } from "@/lib/auth-gate"

export type LoginState = { error?: string }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") || "")
  if (password !== SITE_PASSWORD) {
    return { error: "Fel lösenord. Försök igen." }
  }

  const store = await cookies()
  store.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    // sameSite "none" + secure lets the cookie survive the v0 preview iframe.
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })

  redirect("/")
}

export async function logout() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
  redirect("/login")
}
