# AI Scout – Finlandia P2011

Minimal Next.js-dashboard kopplad till Supabase-vyn `ai_scout_dashboard`.

## 1. Ladda upp till GitHub
Ladda upp alla filer och mappar i ZIP-filen till repositoryt `ai-scout-finlandia`.

## 2. Importera i Vercel
Importera GitHub-repositoryt i Vercel. Vercel ska känna igen projektet som Next.js.

## 3. Environment Variables i Vercel
Lägg till:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` får aldrig läggas i frontend-kod eller exponeras publikt. I detta projekt används den bara i serverkod.

## 4. Deploy
Klicka Deploy.

Dashboarden läser en rad från Supabase-vyn `ai_scout_dashboard`.

## Flöde
SvFF -> Supabase Edge Function `sync-svff` -> `games`, `teams`, `standings` -> `ai_scout_dashboard` -> Next.js/Vercel.
