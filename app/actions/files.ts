"use server"

import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { del } from "@vercel/blob"
import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getFiles(category?: string) {
  if (category) {
    return db.select().from(files).where(eq(files.category, category)).orderBy(desc(files.createdAt))
  }
  return db.select().from(files).orderBy(desc(files.createdAt))
}

export async function deleteFile(id: number) {
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1)
  if (!row) return
  try {
    await del(row.pathname)
  } catch {
    // blob may already be gone; still remove the row
  }
  await db.delete(files).where(eq(files.id, id))
  revalidatePath("/")
}
