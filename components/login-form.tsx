"use client"

import { useActionState } from "react"
import { login, type LoginState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"

const initialState: LoginState = {}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-card-foreground font-sans">
          Lösenord
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Ange lösenord"
          aria-invalid={state.error ? true : undefined}
          className="rounded-xl"
        />
        {state.error ? (
          <p className="text-sm text-destructive font-sans" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending} className="rounded-xl">
        {pending ? "Loggar in…" : "Logga in"}
      </Button>
    </form>
  )
}
