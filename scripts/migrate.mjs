import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
  console.error("DATABASE_URL saknas — kan inte köra migrering före build.")
  process.exit(1)
}

const sqlPath = join(dirname(fileURLToPath(import.meta.url)), "chat-request-id.sql")
const sql = readFileSync(sqlPath, "utf8")

const client = new pg.Client({ connectionString: databaseUrl })
await client.connect()
try {
  await client.query(sql)
  console.log("Migrering klar: chat_messages.request_id")
} finally {
  await client.end()
}
