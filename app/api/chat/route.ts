import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { db } from "@/lib/db"
import { chatMessages, files } from "@/lib/db/schema"
import { desc } from "drizzle-orm"

const SYSTEM_PROMPT = `Du är "Hjärnan" – en svensk jobbsöks-assistent och coach för Ida.
Du är lagret som tänker och förbereder innan något sägs vidare till videoagenten på sajten.

Ditt uppdrag:
- Hjälp Ida att söka jobb: skriv och förbättra CV och personliga brev, hitta styrkor, förbered intervjuer och formulera svar.
- Var konkret, uppmuntrande och rak. Ge korta, användbara svar på svenska.
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

    // Load recent history for context (oldest first).
    const history = await db
      .select()
      .from(chatMessages)
      .orderBy(desc(chatMessages.createdAt))
      .limit(20)
    history.reverse()

    // Give the brain awareness of what documents exist.
    const docs = await db.select().from(files).orderBy(desc(files.createdAt)).limit(30)
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
          .map((d) => `--- ${d.filename} (${d.category}, av ${d.uploader}) ---\n${(d.extractedText || "").slice(0, PER_DOC)}`)
          .join("\n\n")
      : ""

    const { text: reply } = await generateText({
      model: "openai/gpt-5.4-mini",
      system: `${SYSTEM_PROMPT}\n\n${docSummary}${docContents}`,
      messages: [
        ...history.map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        })),
        { role: "user" as const, content: text },
      ],
    })

    await db.insert(chatMessages).values([
      { role: "user", content: text },
      { role: "assistant", content: reply },
    ])

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("[v0] Chat error:", error)
    return NextResponse.json({ error: "Något gick fel med assistenten" }, { status: 500 })
  }
}
