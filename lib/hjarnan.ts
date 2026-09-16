import type { FileRow } from "./db/schema"
import { collectExtractedText } from "./document-text.ts"

/** AI Gateway model id — confirmed via https://ai-gateway.vercel.sh/v1/models */
export const DEFAULT_GROK_MODEL = "spacexai/grok-4.6"

export function grokModel(env: NodeJS.ProcessEnv = process.env): string {
  return env.GROK_MODEL?.trim() || DEFAULT_GROK_MODEL
}

export const HJARNAN_SYSTEM_PROMPT = `Du är "Hjärnan" (JakobsJobbBot) – en svensk jobbcoach för Ida.
Du är lagret som tänker och förbereder innan något sägs vidare till videoagenten på sajten.

Ditt uppdrag:
- Hjälp Ida att söka jobb: CV, personligt brev, LinkedIn, ansökningar, styrkor och intervjusvar.
- Förklara enkelt. Utgå från att hon kan vara nybörjare.
- Var varm, konkret, uppmuntrande och rak. Ge korta, användbara svar på svenska.
- Hitta aldrig på erfarenhet, meriter eller fakta. Använd bara det som faktiskt står i Idas dokument (extracted_text) eller det hon berättar.
- Inga påhittade personer, Drive-länkar eller e-postadresser – be Ida om sådant om det behövs.
- När du föreslår text (t.ex. ett stycke till ett personligt brev), presentera det tydligt så Ida kan kopiera det.
- Om du saknar information, ställ en kort följdfråga istället för att gissa.
- Läs extracted_text / dokumentinnehållet när det finns och referera till konkreta detaljer därifrån.`

export function documentSummary(
  docs: { filename: string; category: string; uploader: string }[],
): string {
  if (docs.length === 0) return "Inga dokument är uppladdade än."
  return (
    "Uppladdade dokument just nu: " +
    docs.map((d) => `${d.filename} (${d.category}, av ${d.uploader})`).join("; ")
  )
}

export async function buildDocumentContext(docs: FileRow[]): Promise<string> {
  const summary = documentSummary(docs)
  const extracted = await collectExtractedText(docs)
  if (!extracted) return summary
  return `${summary}\n\nInnehåll i Idas dokument (CV, personligt brev m.m.):\n${extracted}`
}

export function chatErrorMessage(error: unknown): { status: number; error: string } {
  const message = error instanceof Error ? error.message : String(error ?? "")
  if (/api key|oidc|unauthorized|401|credential/i.test(message)) {
    return {
      status: 503,
      error:
        "AI Gateway är inte konfigurerad. På Vercel räcker OIDC; lokalt behövs AI_GATEWAY_API_KEY (eller vercel env pull).",
    }
  }
  if (/402|budget|payment required/i.test(message)) {
    return { status: 503, error: "AI Gateway-budgeten är slut. Försök igen senare." }
  }
  if (/429|rate limit/i.test(message)) {
    return { status: 429, error: "För många förfrågningar. Vänta en stund och försök igen." }
  }
  return { status: 500, error: "Något gick fel med assistenten" }
}
