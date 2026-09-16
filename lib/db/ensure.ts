import { pool } from "@/lib/db"

let ensured: Promise<void> | null = null

const ENSURE_SQL = `
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS request_id text;
CREATE INDEX IF NOT EXISTS chat_messages_request_id_idx ON chat_messages (request_id);
CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_request_id_user_uidx
  ON chat_messages (request_id)
  WHERE role = 'user' AND request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_request_id_assistant_uidx
  ON chat_messages (request_id)
  WHERE role = 'assistant' AND request_id IS NOT NULL;
`

export function ensureChatSchema() {
  if (!ensured) {
    ensured = pool.query(ENSURE_SQL).then(() => undefined)
  }
  return ensured
}
