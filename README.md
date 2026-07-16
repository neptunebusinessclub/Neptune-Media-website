# Neptune Media — Cloudflare Native

Application Web TV et Studio Admin native Cloudflare, sans Supabase.

- Worker + Static Assets
- Durable Object pour le catalogue, l’administration, les publicités et les statistiques
- Groq côté serveur pour Neptune Copilot
- Tunnel de réservation séparé et inchangé

Secrets Cloudflare requis : `SESSION_SECRET`, `BOOTSTRAP_TOKEN`, `GROQ_API_KEY`.

Déploiement : `npm install`, `npm run check`, puis `npm run deploy`.
