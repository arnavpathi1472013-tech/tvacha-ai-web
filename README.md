# TVACHA AI (त्वचा.ai)

## Run locally
1. `npm i -g wrangler` · copy `.dev.vars.example` to `.dev.vars` and add a key (free Gemini key works with the defaults)
2. `wrangler dev` → open the printed localhost URL.
No key = clearly labelled DEMO mode (sample data, not real analysis).

## Deploy (free)
`wrangler login` · `wrangler secret put AI_API_KEY` · `wrangler deploy`. One Worker serves the frontend and `/api/analyze` over HTTPS.

## Android
Open the deployed URL in Chrome → menu → Install app. For an APK, use Bubblewrap/PWABuilder (needs 192/512 PNG icons made from `icon.svg`).

## Test
Online with key: upload a clear skin photo → report. Airplane mode: app opens, library/questionnaire work, analysis shows an offline message. Tick "Difficulty breathing" → emergency screen appears before any AI call.

## Status
Functional: offline screen, skincare guidelines (unreviewed), UI flow, image checks, safety screening, offline shell, library, Worker + provider modules (need testing with your key).
Needs config: AI_API_KEY. 
Not built: PNG icons (see manifest note), consent persistence (intentionally omitted).

## Automated tests
`npm test` (Node 18+): safety screening, AI-response validation, Worker request validation.
