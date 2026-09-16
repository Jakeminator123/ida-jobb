import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  MAX_CHARS_PER_DOC,
  MAX_DOCS,
  MAX_EXTRACTED_CHARS,
  boundExtractedText,
  pickDocumentsForExtract,
} from "./document-text.ts"
import type { FileRow } from "./db/schema.ts"

function file(partial: Partial<FileRow> & { filename: string; category: string }): FileRow {
  return {
    id: partial.id ?? 1,
    category: partial.category,
    uploader: partial.uploader ?? "ida",
    filename: partial.filename,
    pathname: partial.pathname ?? `/${partial.filename}`,
    contentType: partial.contentType ?? "application/pdf",
    size: partial.size ?? 100,
    createdAt: partial.createdAt ?? new Date("2026-01-02T00:00:00Z"),
  }
}

describe("pickDocumentsForExtract", () => {
  it("prioriterar CV och personligt brev och begränsar antal", () => {
    const docs = [
      file({ id: 1, filename: "notes.txt", category: "upload", createdAt: new Date("2026-03-01") }),
      file({ id: 2, filename: "cv.pdf", category: "cv", createdAt: new Date("2026-01-01") }),
      file({ id: 3, filename: "brev.docx", category: "cover_letter", createdAt: new Date("2026-02-01") }),
      file({ id: 4, filename: "extra1.pdf", category: "upload" }),
      file({ id: 5, filename: "extra2.pdf", category: "upload" }),
      file({ id: 6, filename: "extra3.pdf", category: "upload" }),
      file({ id: 7, filename: "agent.pdf", category: "agent_material" }),
    ]
    const picked = pickDocumentsForExtract(docs)
    assert.equal(picked.length, MAX_DOCS)
    assert.equal(picked[0]?.filename, "cv.pdf")
    assert.equal(picked[1]?.filename, "brev.docx")
  })
})

describe("boundExtractedText", () => {
  it("formaterar filnamn + text", () => {
    const text = boundExtractedText([
      { filename: "cv.pdf", category: "cv", text: "Ida Andersson, utvecklare" },
    ])
    assert.match(text, /cv\.pdf/)
    assert.match(text, /Ida Andersson/)
  })

  it("kapar per dokument och totalt", () => {
    const huge = "x".repeat(MAX_CHARS_PER_DOC + 500)
    const many = Array.from({ length: 8 }, (_, i) => ({
      filename: `f${i}.txt`,
      category: "upload",
      text: huge,
    }))
    const text = boundExtractedText(many)
    assert.ok(text.length <= MAX_EXTRACTED_CHARS)
    assert.ok(!text.includes("x".repeat(MAX_CHARS_PER_DOC + 1)))
  })

  it("tom lista ger tom sträng", () => {
    assert.equal(boundExtractedText([]), "")
  })
})
