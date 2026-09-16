import { ArrowUpRight, BriefcaseBusiness, CalendarDays, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { JobOfferRow } from "@/lib/db/schema"

function formatDate(value: Date | null) {
  if (!value) return null
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" }).format(value)
}

export function JobOffersCard({ jobs }: { jobs: JobOfferRow[] }) {
  return (
    <Card className="bento-card lg:col-span-3 p-6 bg-card border border-border rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 text-primary">
            <BriefcaseBusiness className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-card-foreground font-sans">Nya jobb för Ida</h2>
            <p className="text-sm text-muted-foreground font-sans">Tre nya matchningar per dag från Platsbanken</p>
          </div>
        </div>
        <Badge variant="secondary" className="rounded-full font-sans">{jobs.length} av 20 sparade</Badge>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background/40 px-5 py-10 text-center">
          <BriefcaseBusiness className="w-7 h-7 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium font-sans">Första jobbförslagen kommer snart</p>
          <p className="text-sm text-muted-foreground mt-1 font-sans">Den dagliga sökningen körs automatiskt.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 max-h-[560px] overflow-y-auto pr-1">
          {jobs.map((job) => (
            <article key={job.id} className="group rounded-2xl border border-border bg-background/55 p-4 transition-colors hover:border-primary/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold leading-snug text-card-foreground font-sans">{job.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-sans truncate">{job.employer}</p>
                </div>
                <a
                  href={job.applicationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center w-9 h-9 shrink-0 rounded-full border border-border text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  aria-label={`Öppna ansökan för ${job.title}`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-xs text-muted-foreground font-sans">
                {job.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                {formatDate(job.expiresAt) && <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" />Sök senast {formatDate(job.expiresAt)}</span>}
              </div>

              {job.matchReason && <p className="mt-3 text-sm leading-relaxed text-card-foreground/80 font-sans">{job.matchReason}</p>}
              <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex mt-3 text-xs font-medium text-primary hover:underline font-sans">
                Se annons på Platsbanken
              </a>
            </article>
          ))}
        </div>
      )}
    </Card>
  )
}
