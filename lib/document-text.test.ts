import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { FileRow } from "./db/schema.ts"
import {
  boundExtractedText,
  collectExtractedText,
  pickDocumentsForExtract,
} from "./document-text.ts"

function file(partial: Partial<FileRow> & Pick<FileRow, "filename" | "category">): FileRow {
  return {
    id: 1,
    uploader: "ida",
    pathname: "missing-should-not-be-read",
    contentType: "application/pdf",
    size: 10,
    extractedText: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...partial,
  }
}

describe("pickDocumentsForExtract", () => {
  it("prioriterar CV och personligt brev", () => {
    const picked = pickDocumentsForExtract([
      file({ id: 1, filename: "notes.txt", category: "upload" }),
      file({ id: 2, filename: "brev.pdf", category: "cover_letter" }),
      file({ id: 3, filename: "cv.pdf", category: "cv" }),
    ])
    assert.deepEqual(
      picked.map((d) => d.filename),
      ["cv.pdf", "brev.pdf", "notes.txt"],
    )
  })
})

describe("boundExtractedText", () => {
  it("returnerar tom sträng utan delar", () => {
    assert.equal(boundExtractedText([]), "")
  })

  it("kapslar in filnamn och kategori", () => {
    const text = boundExtractedText([{ filename: "cv.pdf", category: "cv", text: "  Ida  " }])
    assert.equal(text, "--- cv.pdf (cv) ---\nIda")
  })
})

describe("collectExtractedText", () => {
  it("använder sparad extracted_text utan Blob", async () => {
    const text = await collectExtractedText([
      file({ filename: "cv.pdf", category: "cv", extractedText: "Barista i två somrar" }),
    ])
    assert.match(text, /Barista i två somrar/)
    assert.match(text, /cv\.pdf/)
  })
})
