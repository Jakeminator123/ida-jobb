"use server"

import { db } from "@/lib/db"
import { todos } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getTodos() {
  return db.select().from(todos).orderBy(asc(todos.done), asc(todos.position), asc(todos.createdAt))
}

export async function addTodo(title: string) {
  const trimmed = title.trim()
  if (!trimmed) return
  await db.insert(todos).values({ title: trimmed })
  revalidatePath("/")
}

export async function toggleTodo(id: number, done: boolean) {
  await db.update(todos).set({ done }).where(eq(todos.id, id))
  revalidatePath("/")
}

export async function deleteTodo(id: number) {
  await db.delete(todos).where(eq(todos.id, id))
  revalidatePath("/")
}
