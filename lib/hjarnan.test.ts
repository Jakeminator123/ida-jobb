import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { FileRow } from "./db/schema.ts"
import {
  DEFAULT_GROK_MODEL,
  HJARNAN_SYSTEM_PROMPT,
  buildDocumentContext,
  chatErrorMessage,
  documentSummary,
  grokModel,
} from "./hjarnan.ts"

function file(partial: Partial<FileRow> & Pick<FileRow, "filename" | "category">): FileRow {
  return {
    id: 1,
    uploader: "ida",
    pathname: "cv/x.pdf",
    contentType: "application/pdf",
    size: 10,
    extractedText: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...partial,
  }
}

describe("hjarnan prompt + model", () => {
  it("beskriver svensk jobbcoach som inte hittar på erfarenhet", () => {
    assert.match(HJARNAN_SYSTEM_PROMPT, /svensk jobbcoach/)
    assert.match(HJARNAN_SYSTEM_PROMPT, /Ida/)
    assert.match(HJARNAN_SYSTEM_PROMPT, /Hitta aldrig på/)
    assert.match(HJARNAN_SYSTEM_PROMPT, /nybörjare/)
    assert.match(HJARNAN_SYSTEM_PROMPT, /extracted_text/)
  })

  it("använder Grok via AI Gateway-slug", () => {
    assert.equal(DEFAULT_GROK_MODEL, "spacexai/grok-4.6")
    assert.equal(grokModel({}), "spacexai/grok-4.6")
    assert.equal(grokModel({ GROK_MODEL: "spacexai/grok-4.5" }), "spacexai/grok-4.5")
  })
})

describe("documentSummary / buildDocumentContext", () => {
  it("summerar tom lista", () => {
    assert.equal(documentSummary([]), "Inga dokument är uppladdade än.")
  })

  it("listar filer", () => {
    assert.equal(
      documentSummary([{ filename: "cv.pdf", category: "cv", uploader: "ida" }]),
      "Uppladdade dokument just nu: cv.pdf (cv, av ida)",
    )
  })

  it("lägger extracted_text i kontexten", async () => {
    const ctx = await buildDocumentContext([
      file({ filename: "cv.pdf", category: "cv", extractedText: "Ida Andersson, barista" }),
    ])
    assert.match(ctx, /cv\.pdf/)
    assert.match(ctx, /Ida Andersson, barista/)
    assert.match(ctx, /Innehåll i Idas dokument/)
  })
})

describe("chatErrorMessage", () => {
  it("mappar saknad Gateway-auth till 503", () => {
    const mapped = chatErrorMessage(new Error("Missing AI Gateway API key"))
    assert.equal(mapped.status, 503)
    assert.match(mapped.error, /AI Gateway/)
  })

  it("mappar övrigt till 500", () => {
    const mapped = chatErrorMessage(new Error("boom"))
    assert.equal(mapped.status, 500)
  })
})
