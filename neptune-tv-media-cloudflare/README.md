# Neptune Media — Cloudflare Native

Application Web TV et Studio Admin sans Supabase.

## Architecture

- Cloudflare Worker + Static Assets : Web TV et Studio Admin
- Durable Object SQLite : catalogue, utilisateurs, sessions, campagnes, analytics, conversions et audit
- Workers AI : Neptune Copilot avec `@cf/openai/gpt-oss-120b`
- Cloudflare Assets : vidéos Web optimisées et miniatures

## Déploiement automatique

Le workflow `.github/workflows/deploy-cloudflare.yml` déploie chaque push sur `main`.

Secrets GitHub requis :

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

Après le premier déploiement, ajouter le secret Worker `BOOTSTRAP_TOKEN` avec Wrangler ou le dashboard Cloudflare. Il sert uniquement à créer le premier administrateur.

Secret facultatif pour relier les conversions du tunnel :

```text
CONVERSION_WEBHOOK_SECRET
```

## Vérification locale

```bash
npm ci
npm run check
npm run dev
```

Le tunnel `https://media.neptunebusiness.com` reste séparé et inchangé.
