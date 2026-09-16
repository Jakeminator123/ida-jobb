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

## Hjärnan-chatten (synk Grok via AI Gateway)

DI-fliken **Hjärnan** anropar Grok synkront i samma request. Ingen webhook, ingen callback, ingen poll.

```
[Hjärnan UI]
    |  POST /api/chat  { message }
    v
[API] historia + extracted_text (CV / personligt brev)
    |  generateText("spacexai/grok-4.6")  →  Vercel AI Gateway
    v
[JSON] { reply }   samma request
    |
    v
[UI] visar svaret  +  speakGrokReply(reply) stub
```

`GROKBOT_WEBHOOK_URL`, `GROKBOT_WEBHOOK_KEY` och `GROKBOT_CALLBACK_SECRET` används **inte**. `/api/chat/callback` är borttagen.

Auth mot Gateway: på Vercel räcker **OIDC** (aktivera AI Gateway på projektet). Lokalt: `vercel env pull` eller `AI_GATEWAY_API_KEY`. Inga provider-nycklar (`XAI_API_KEY` m.m.) behövs.

Modell: `spacexai/grok-4.6` (override med valfri `GROK_MODEL`).

Dokumenttext: vid uppladdning sparas `files.extracted_text`. Chatten läser den via `collectExtractedText` (CV och personligt brev först; max 5 dokument, 8 000 tecken/fil, 24 000 totalt). Saknas sparad text läses filen från Blob.

### Vercel env (inga hemligheter i git)

| Variabel | Krävs | Användning |
|---|---|---|
| `DATABASE_URL` | ja | Postgres/Neon. Migrering körs i build-steget. |
| `SITE_PASSWORD` | ja i prod | Lösenordsskydd. Tomt = öppet (lokalt). |
| `AI_GATEWAY_API_KEY` | lokalt/CI | Fallback när `VERCEL_OIDC_TOKEN` saknas. Inte nödvändig på Vercel. |
| `GROK_MODEL` | nej | Standard `spacexai/grok-4.6` |
| `DID_LANK` | nej | D-ID share-länk i UI |
| `APP_URL` | nej | Används inte längre av chatten |

Borttaget (ignoreras om de ligger kvar i Vercel): `GROKBOT_WEBHOOK_*`, `GROKBOT_CALLBACK_SECRET`.

`SITE_PASSWORD` ska sättas i Vercel Project Settings — inte i koden.

### En konversation (Grok = hjärna, D-ID = röst)

Målet: samma Grok-svar visas som text och talas av D-ID när video är på. Stock-embed kan inte köras som ren TTS. Kvar:

- D-ID Custom LLM mot en Grok-endpoint, eller
- D-ID Agents SDK/API som tar emot färdigt `reply`

Hook idag: `speakGrokReply(reply)` / event `ida-grok-reply` när svaret landar.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
- [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
