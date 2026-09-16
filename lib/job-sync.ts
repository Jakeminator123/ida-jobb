import { generateText, Output } from "ai"
import { and, asc, count, desc, gte, inArray, notInArray } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import {
  DAILY_JOB_LIMIT,
  files,
  jobOffers,
  MAX_SAVED_JOB_OFFERS,
  type JobSearchProfile,
  type JobSelection,
  type JobSyncResult,
  type JobTechHit,
  type JobTechResponse,
  type NewJobOffer,
} from "@/lib/db/schema"

const JOBTECH_SEARCH_URL = "https://jobsearch.api.jobtechdev.se/search"
const FALLBACK_TERMS = ["kundservice", "butik", "administration"]
const MODEL = "spacexai/grok-4.6"

function startOfUtcDay() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function locationFor(hit: JobTechHit) {
  const address = hit.workplace_address
  return address?.city || address?.municipality || address?.region || "Sverige"
}

async function buildSearchProfile(profileText: string): Promise<JobSearchProfile> {
  if (!profileText.trim()) return { searchTerms: FALLBACK_TERMS }

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({
      schema: z.object({
        searchTerms: z.array(z.string().min(2).max(60)).min(1).max(3),
      }),
    }),
    system:
      "Du väljer relevanta svenska fritextsökningar för Arbetsförmedlingens Platsbanken. Använd bara erfarenhet och mål som faktiskt framgår. Svara med 1–3 korta yrkesroller eller kompetensområden.",
    prompt: `Skapa söktermer för denna kandidats underlag:\n\n${profileText.slice(0, 12_000)}`,
  })

  return output
}

async function fetchJobTech(term: string): Promise<JobTechHit[]> {
  const url = new URL(JOBTECH_SEARCH_URL)
  url.searchParams.set("q", term)
  url.searchParams.set("limit", "15")
  url.searchParams.set("sort", "pubdate-desc")

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`JobTech svarade ${response.status}`)
  const data = (await response.json()) as JobTechResponse
  return data.hits || []
}

async function selectMatches(candidates: JobTechHit[], profileText: string, limit: number): Promise<JobSelection[]> {
  if (!profileText.trim()) {
    return candidates.slice(0, limit).map((job) => ({
      id: job.id,
      reason: "Ny aktuell annons från Platsbanken. Ladda upp ditt CV för mer personliga matchningar.",
    }))
  }

  const summaries = candidates.slice(0, 30).map((job) => ({
    id: job.id,
    title: job.headline,
    employer: job.employer?.name || "Okänd arbetsgivare",
    location: locationFor(job),
    description: job.description?.text?.slice(0, 700) || "",
  }))

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({
      schema: z.object({
        selections: z
          .array(z.object({ id: z.string(), reason: z.string().min(10).max(220) }))
          .max(limit),
      }),
    }),
    system:
      "Du är en noggrann svensk jobbcoach. Välj endast verkliga annonser från listan. Matcha mot kandidatens dokument utan att hitta på erfarenhet. Skriv en kort, konkret matchningsorsak på svenska.",
    prompt: `Kandidatens underlag:\n${profileText.slice(0, 10_000)}\n\nAnnonser:\n${JSON.stringify(summaries)}`,
  })

  const validIds = new Set(candidates.map((job) => job.id))
  return output.selections.filter((selection) => validIds.has(selection.id)).slice(0, limit)
}

async function pruneOldJobs() {
  const keep = await db
    .select({ id: jobOffers.id })
    .from(jobOffers)
    .orderBy(desc(jobOffers.createdAt), desc(jobOffers.id))
    .limit(MAX_SAVED_JOB_OFFERS)

  if (keep.length === MAX_SAVED_JOB_OFFERS) {
    await db.delete(jobOffers).where(notInArray(jobOffers.id, keep.map((row) => row.id)))
  }
}

export async function syncJobOffers(): Promise<JobSyncResult> {
  const [{ value: addedToday }] = await db
    .select({ value: count() })
    .from(jobOffers)
    .where(gte(jobOffers.createdAt, startOfUtcDay()))

  const remaining = Math.max(0, DAILY_JOB_LIMIT - Number(addedToday))
  if (remaining === 0) {
    await pruneOldJobs()
    const [{ value: total }] = await db.select({ value: count() }).from(jobOffers)
    return { added: 0, total: Number(total), skipped: "Dagens tre förslag finns redan." }
  }

  const docs = await db
    .select({ text: files.extractedText })
    .from(files)
    .where(and(inArray(files.category, ["cv", "cover_letter", "upload"]), gte(files.createdAt, new Date(0))))
    .orderBy(desc(files.createdAt))
    .limit(5)
  const profileText = docs.map((doc) => doc.text || "").filter(Boolean).join("\n\n").slice(0, 16_000)
  const profile = await buildSearchProfile(profileText)

  const fetched = await Promise.all(profile.searchTerms.map(fetchJobTech))
  const deduped = Array.from(new Map(fetched.flat().map((job) => [job.id, job])).values())
  const existing = deduped.length
    ? await db.select({ externalId: jobOffers.externalId }).from(jobOffers).where(inArray(jobOffers.externalId, deduped.map((job) => job.id)))
    : []
  const existingIds = new Set(existing.map((row) => row.externalId))
  const candidates = deduped.filter((job) => !existingIds.has(job.id) && job.webpage_url)
  const selections = await selectMatches(candidates, profileText, remaining)
  const selectedById = new Map(selections.map((selection) => [selection.id, selection]))

  const values: NewJobOffer[] = candidates
    .filter((job) => selectedById.has(job.id))
    .slice(0, remaining)
    .map((job) => ({
      externalId: job.id,
      title: job.headline,
      employer: job.employer?.name || "Okänd arbetsgivare",
      location: locationFor(job),
      description: job.description?.text?.slice(0, 900) || null,
      applicationUrl: job.application_details?.url || job.webpage_url!,
      sourceUrl: job.webpage_url!,
      publishedAt: job.publication_date ? new Date(job.publication_date) : null,
      expiresAt: job.last_publication_date ? new Date(job.last_publication_date) : null,
      matchReason: selectedById.get(job.id)?.reason || null,
    }))

  if (values.length) await db.insert(jobOffers).values(values).onConflictDoNothing({ target: jobOffers.externalId })
  await pruneOldJobs()

  const [{ value: total }] = await db.select({ value: count() }).from(jobOffers)
  return { added: values.length, total: Number(total) }
}

export async function getLatestJobOffers() {
  return db.select().from(jobOffers).orderBy(desc(jobOffers.createdAt), asc(jobOffers.title)).limit(MAX_SAVED_JOB_OFFERS)
}
