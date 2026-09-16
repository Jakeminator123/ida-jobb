import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { FileCard } from "@/components/file-card"
import { TodoCard } from "@/components/todo-card"
import { DiChatCard } from "@/components/di-chat-card"
import { JobOffersCard } from "@/components/job-offers-card"
import { getLatestJobOffers } from "@/lib/job-sync"
import { getFiles } from "@/app/actions/files"
import { getTodos } from "@/app/actions/todos"
import { getChatHistory } from "@/app/actions/chat"
import { logout } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { MapPin, Sparkles, LogOut } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function Home() {
  const [cvFiles, coverFiles, uploads, agentMaterials, todos, chat, jobs] = await Promise.all([
    getFiles("cv"),
    getFiles("cover_letter"),
    getFiles("upload"),
    getFiles("agent_material"),
    getTodos(),
    getChatHistory(),
    getLatestJobOffers(),
  ])

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-primary/30 bg-primary/10 shadow-sm">
                <img
                  src="/images/ida.png"
                  alt="Porträtt av Ida"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground font-sans tracking-tight">
                Idas jobbsökarstudio
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span className="font-sans">Söker nya möjligheter</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 font-sans">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Tillgänglig för jobb
            </span>
            <ThemeToggle />
            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-sans">Logga ut</span>
              </Button>
            </form>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Intro / status */}
          <Card
            id="about"
            className="bento-card bento-glass lg:col-span-1 p-6 border border-border rounded-2xl flex flex-col"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/15 text-primary shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-card-foreground font-sans">Välkommen</h2>
            </div>
            <p className="text-sm text-card-foreground leading-relaxed font-sans flex-1">
              Detta är Idas personliga jobbsökarstudio. Här samlar Ida sitt CV och personliga brev,
              chattar med sin AI-agent för att förbereda ansökningar och intervjuer, laddar upp material och
              hämtar det som agenten tagit fram – allt på ett ställe.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              <Badge variant="secondary" className="font-sans text-xs rounded-full">
                CV
              </Badge>
              <Badge variant="secondary" className="font-sans text-xs rounded-full">
                Personligt brev
              </Badge>
              <Badge variant="secondary" className="font-sans text-xs rounded-full">
                Intervjuträning
              </Badge>
              <Badge variant="secondary" className="font-sans text-xs rounded-full">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-agent
              </Badge>
            </div>
          </Card>

          {/* DI-chatt (brain + video) */}
          <DiChatCard history={chat} agentUrl={process.env.DID_LANK} className="lg:col-span-2 min-h-[560px]" />

          {/* Daily job matches */}
          <JobOffersCard jobs={jobs} />

          {/* CV + cover letter */}
          <FileCard
            title="CV"
            description="Ladda upp och håll ditt CV uppdaterat"
            category="cv"
            files={cvFiles}
            accept=".pdf,.doc,.docx"
            emptyLabel="Inget CV uppladdat ännu"
            className="min-h-[300px]"
          />
          <FileCard
            title="Personligt brev"
            description="Dina personliga brev och utkast"
            category="cover_letter"
            files={coverFiles}
            accept=".pdf,.doc,.docx"
            emptyLabel="Inget personligt brev ännu"
            className="min-h-[300px]"
          />

          {/* To-do */}
          <TodoCard todos={todos} className="min-h-[300px]" />

          {/* Ida's general uploads */}
          <FileCard
            title="Mina filer"
            description="Ladda upp intyg, betyg, arbetsprover m.m."
            category="upload"
            files={uploads}
            emptyLabel="Inga filer ännu"
            className="min-h-[300px]"
          />

          {/* Agent materials for Ida to download */}
          <FileCard
            title="Material från agenten"
            description="Filer som agenten tagit fram åt dig – ladda ner här"
            category="agent_material"
            uploader="agent"
            files={agentMaterials}
            emptyLabel="Inget material ännu"
            className="min-h-[300px] lg:col-span-2"
          />
        </div>

        <footer className="mt-12 text-center">
          <p className="text-muted-foreground text-sm font-sans">Idas jobbsökarstudio • byggd med v0</p>
        </footer>
      </div>
    </div>
  )
}
