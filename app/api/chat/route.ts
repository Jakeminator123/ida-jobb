import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"
import { desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { chatMessages, files } from "@/lib/db/schema"

const SYSTEM_PROMPT = `Du är "JakobsJobbBot" – en svensk jobbcoach för Jakobs kandidater, här som personlig coach för Ida.
Du är hjärnan som tänker och förbereder innan något sägs vidare till videoagenten på sajten.

Din personlighet och ditt uppdrag:
- Du är jobbcoach: hjälp med jobbsök, CV-varianter, LinkedIn och ansökningar.
- Förklara enkelt och utgå från att personen kan vara nybörjare.
- Var konkret, uppmuntrande och rak. Ge korta, användbara svar på svenska.
- Hitta aldrig på erfarenhet, meriter eller fakta. Använd bara det som faktiskt står i Idas dokument eller det hon berättar.
- Inga förifyllda personer, Drive-länkar eller e-postadresser – be Ida om sådant om det behövs.
- Fråga efter kandidatens namn, målroller, ort och relevant bakgrund innan du sparar fakta eller formulerar färdiga ansökningar.
- När du föreslår text (t.ex. ett stycke till ett personligt brev), presentera det tydligt så Ida kan kopiera det.
- Om du saknar information, ställ en kort följdfråga istället för att gissa.
- Håll en varm, professionell ton.
- Du har full läsåtkomst till innehållet i Idas uppladdade dokument (CV, personligt brev, filer och material från agenten). Använd innehållet aktivt när du hjälper henne, och referera till konkreta detaljer ur dokumenten.`

export async function POST(request: NextRequest) {
  try {
    const { message } = (await request.json()) as { message?: string }
    const text = (message || "").trim()
    if (!text) {
      return NextResponse.json({ error: "Tomt meddelande" }, { status: 400 })
    }

    const [historyDesc, docs] = await Promise.all([
      db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt)).limit(20),
      db.select().from(files).orderBy(desc(files.createdAt)).limit(30),
    ])
    const history = historyDesc.reverse()

    // Give the brain awareness of what documents exist.
    const docSummary = docs.length
      ? "Uppladdade dokument just nu: " +
        docs.map((d) => `${d.filename} (${d.category}, av ${d.uploader})`).join("; ")
      : "Inga dokument är uppladdade än."

    // Give the brain the actual contents of the documents it can read.
    const PER_DOC = 6000
    const withText = docs.filter((d) => d.extractedText && d.extractedText.trim())
    const docContents = withText.length
      ? "\n\nInnehåll i dokumenten (full läsåtkomst):\n" +
        withText
          .map(
            (d) =>
              `--- ${d.filename} (${d.category}, av ${d.uploader}) ---\n${(d.extractedText || "").slice(0, PER_DOC)}`,
          )
          .join("\n\n")
      : ""

    const { text: reply } = await generateText({
      model: "spacexai/grok-4.6",
      system: `${SYSTEM_PROMPT}\n\n${docSummary}${docContents}`,
      messages: [
        ...history.map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        })),
        { role: "user" as const, content: text },
      ],
    })

    await db.insert(chatMessages).values({ role: "user", content: text })
    await db.insert(chatMessages).values({ role: "assistant", content: reply })

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("[v0] Chat error:", error)
    return NextResponse.json({ error: "Något gick fel med assistenten" }, { status: 500 })
  }
}
