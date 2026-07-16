# Neptune Media — Cloudflare Native

Application Web TV et Studio Admin native Cloudflare, sans Supabase.

- Worker + Static Assets
- Durable Object SQLite pour le catalogue, l’administration, les publicités et les statistiques
- Workers AI pour Neptune Copilot
- Tunnel de réservation séparé et inchangé

Déploiement automatique via GitHub Actions avec :

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `BOOTSTRAP_TOKEN`

Validation locale : `npm install && npm run check`.
