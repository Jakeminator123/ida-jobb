"use server"

import { db } from "@/lib/db"
import { chatMessages } from "@/lib/db/schema"
import { asc } from "drizzle-orm"

export async function getChatHistory() {
  return db.select().from(chatMessages).orderBy(asc(chatMessages.createdAt))
}
