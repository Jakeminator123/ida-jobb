import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { FileCard } from "@/components/file-card"
import { TodoCard } from "@/components/todo-card"
import { DiChatCard } from "@/components/di-chat-card"
import { getFiles } from "@/app/actions/files"
import { getTodos } from "@/app/actions/todos"
import { getChatHistory } from "@/app/actions/chat"
import { MapPin, Sparkles } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function Home() {
  const [cvFiles, coverFiles, uploads, agentMaterials, todos, chat] = await Promise.all([
    getFiles("cv"),
    getFiles("cover_letter"),
    getFiles("upload"),
    getFiles("agent_material"),
    getTodos(),
    getChatHistory(),
  ])

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary font-sans">ID</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-sans">Idas jobbsökarstudio</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                <MapPin className="w-4 h-4" />
                <span className="font-sans">Söker nya möjligheter</span>
              </div>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Intro / status */}
          <Card
            id="about"
            className="lg:col-span-1 p-6 bg-card border border-border rounded-2xl shadow-none flex flex-col"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
              <h2 className="font-bold text-card-foreground font-sans">Tillgänglig för jobb</h2>
            </div>
            <p className="text-sm text-card-foreground leading-relaxed font-sans flex-1">
              Välkommen till Idas personliga jobbsökarstudio. Här samlar Ida sitt CV och personliga brev,
              chattar med sin AI-agent för att förbereda ansökningar och intervjuer, laddar upp material och
              hämtar det som agenten tagit fram – allt på ett ställe.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
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
