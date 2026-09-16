import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core"

// Uploaded documents: CV, cover letter, general uploads from Ida,
// and material uploaded by the agent working on the site.
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  // "cv" | "cover_letter" | "upload" | "agent_material"
  category: text("category").notNull(),
  // "ida" | "agent"
  uploader: text("uploader").notNull().default("ida"),
  filename: text("filename").notNull(),
  pathname: text("pathname").notNull(),
  contentType: text("content_type"),
  size: integer("size"),
  // Text extracted from the document so the AI brain can read its full contents.
  extractedText: text("extracted_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  // "user" | "assistant"
  role: text("role").notNull(),
  content: text("content").notNull(),
  // Shared id for an async Grok Bot turn (user row + matching assistant row).
  requestId: text("request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type FileRow = typeof files.$inferSelect
export type TodoRow = typeof todos.$inferSelect
export type ChatMessageRow = typeof chatMessages.$inferSelect
