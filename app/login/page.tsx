import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Card } from "@/components/ui/card"
import { LoginForm } from "@/components/login-form"
import { COOKIE_NAME, COOKIE_VALUE, siteGateEnabled } from "@/lib/auth-gate"

export default async function LoginPage() {
  const store = await cookies()
  if (!siteGateEnabled() || store.get(COOKIE_NAME)?.value === COOKIE_VALUE) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8 bg-card border border-border rounded-2xl shadow-none">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <span className="text-xl font-bold text-primary font-sans">ID</span>
          </div>
          <h1 className="text-xl font-bold text-card-foreground font-sans">Idas jobbsökarstudio</h1>
          <p className="text-sm text-muted-foreground mt-1 font-sans">Ange lösenordet för att komma in.</p>
        </div>
        <LoginForm />
      </Card>
    </div>
  )
}
