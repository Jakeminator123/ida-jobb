-- Local development schema for Idas jobbsökarstudio (ida-jobb).
-- Idempotent: safe to run on every environment start.
-- Mirrors lib/db/schema.ts (files, todos, chat_messages) and the
-- request_id migration from scripts/chat-request-id.sql.

CREATE TABLE IF NOT EXISTS files (
  id           serial PRIMARY KEY,
  category     text NOT NULL,
  uploader     text NOT NULL DEFAULT 'ida',
  filename     text NOT NULL,
  pathname     text NOT NULL,
  content_type text,
  size         integer,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS todos (
  id         serial PRIMARY KEY,
  title      text NOT NULL,
  done       boolean NOT NULL DEFAULT false,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id         serial PRIMARY KEY,
  role       text NOT NULL,
  content    text NOT NULL,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- request_id migration (also applied automatically by lib/db/ensure.ts).
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS request_id text;

CREATE INDEX IF NOT EXISTS chat_messages_request_id_idx
  ON chat_messages (request_id);

CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_request_id_user_uidx
  ON chat_messages (request_id)
  WHERE role = 'user' AND request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_request_id_assistant_uidx
  ON chat_messages (request_id)
  WHERE role = 'assistant' AND request_id IS NOT NULL;
