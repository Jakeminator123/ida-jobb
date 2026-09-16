# ida-jobb

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_UqFBaLmdRJ3C0YHiYzEgMGVlyJTb)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Hjärnan-chatten (async Grok Bot)

DI-fliken **Hjärnan** anropar inte längre `generateText` / OpenAI inline. Flödet är asynkront:

```
[Hjärnan UI]
    |  POST /api/chat  { message }
    v
[API] sparar user-rad i chat_messages (med request_id)
    |  POST GROKBOT_WEBHOOK_URL
    |  Authorization: Bearer <GROKBOT_WEBHOOK_KEY>
    v
[Grok Bot-rutin startar]          UI visar "Hjärnan tänker…"
    |  POST /api/chat/callback
    |  Authorization: Bearer <GROKBOT_CALLBACK_SECRET>
    |  { request_id, reply }
    v
[API] sparar assistant-rad
    |
    v
[UI] pollar GET /api/chat?request_id=… tills reply finns
```

Det finns **ingen tyst fallback** till OpenAI. Saknas webhook-env returneras ett tydligt svenskt 503-fel.

D-ID-videoembedden är oförändrad.

### Vercel / `.env` (inga hemligheter i git)

| Variabel | Krävs | Användning |
|---|---|---|
| `GROKBOT_WEBHOOK_URL` | ja | Routine-fältet **POST to** från Grok Bot |
| `GROKBOT_WEBHOOK_KEY` | ja | Routine-fältet **key** (`crsr_…`). Skickas som `Authorization: Bearer <key>`. Om värdet redan börjar med `Bearer ` prefixas det inte igen. |
| `GROKBOT_CALLBACK_SECRET` | ja | Delad hemlighet som Grok Bot måste skicka tillbaka när den POST:ar svaret |
| `APP_URL` | nej | Publik bas-URL, t.ex. `https://ida-jobb.vercel.app`. Används för `reply_url`. Annars `NEXT_PUBLIC_APP_URL` eller `Host` / `X-Forwarded-*`. |
| `DATABASE_URL` | ja | Befintlig Postgres (Neon). Första chat-anropet kör `scripts/chat-request-id.sql` automatiskt (`request_id`-kolumn + index). |

Header ut till Grok Bot: **`Authorization`** (Bearer).  
Header in från Grok Bot: **`Authorization: Bearer <GROKBOT_CALLBACK_SECRET>`**, eller alternativt `x-grokbot-callback-secret`. Callback utan giltig hemlighet får `401`.

Så här skapar du webhook-värdena i Cursor: Bot → View conversation details → Routines → When to run → webhook. Spara rutinen, kopiera **POST to**, **key** och ev. färdig **header**.

Rutinen bör säga ungefär: läs JSON-bodyn, svara som Hjärnan (svenska), POST:a `{ request_id, reply }` till `reply_url` med callback-hemligheten.

### JSON-kontrakt

Ut till Grok Bot (`POST GROKBOT_WEBHOOK_URL`):

```json
{
  "source": "ida-jobb",
  "request_id": "uuid",
  "message": "Idas text",
  "reply_url": "https://<host>/api/chat/callback",
  "history": [{ "role": "user|assistant", "content": "…" }],
  "document_summary": "Uppladdade dokument just nu: …",
  "instructions": "Du är Hjärnan …"
}
```

Tillbaka från Grok Bot (`POST /api/chat/callback`):

```json
{
  "request_id": "uuid",
  "reply": "Svaret på svenska"
}
```

Alias `text` eller `content` accepteras för `reply`. Samma `request_id` två gånger är idempotent (`duplicate: true`).

Klient efter `POST /api/chat`: `{ "status": "pending", "request_id": "uuid" }` — inte ett färdigt assistantsvar.  
Poll: `GET /api/chat?request_id=uuid` → `{ "status": "pending" }` eller `{ "status": "complete", "reply": "…" }`.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
