# Neptune Media — Cloudflare Native

Application Web TV et Studio Admin sans Supabase.

## Architecture

- Cloudflare Worker + Static Assets : Web TV et Studio Admin
- Durable Object SQLite : catalogue, utilisateurs, sessions, campagnes, analytics, conversions et audit
- Workers AI : Neptune Copilot avec `@cf/openai/gpt-oss-120b`
- Cloudflare Assets : vidéos Web optimisées et miniatures
- Resend : codes de connexion et e-mails transactionnels

## Déploiement automatique

Le workflow `.github/workflows/deploy-cloudflare.yml` déploie chaque push sur `main`.

Secrets GitHub requis :

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
RESEND_API_KEY
```

Le workflow synchronise `RESEND_API_KEY` comme secret du Worker `neptune-media-webtv`, puis vérifie automatiquement que la clé est acceptée par l’API Resend. Avec une clé `full_access`, le statut du domaine `neptunebusiness.com` est également contrôlé. Une clé `sending_access` reste compatible avec l’envoi des codes.

Après le premier déploiement, ajouter le secret Worker `BOOTSTRAP_TOKEN` avec Wrangler ou le dashboard Cloudflare. Il sert uniquement à créer le premier administrateur.

Secret facultatif pour relier les conversions du tunnel :

```text
CONVERSION_WEBHOOK_SECRET
```

## Diagnostic e-mail

Le contrôle de production est disponible sur :

```text
/api/public/email-health
```

Il n’expose aucune clé. Il indique uniquement si Resend est configuré, si la clé est acceptée et, lorsque ses permissions le permettent, si le domaine expéditeur est validé.

## Vérification locale

```bash
npm ci
npm run check
npm run dev
```

Le tunnel `https://media.neptunebusiness.com` reste séparé et inchangé.
