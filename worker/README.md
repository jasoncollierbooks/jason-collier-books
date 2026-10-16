# Collier Entertainment sign-in worker

Cloudflare Worker + D1 for Club email sign-in (magic link and 6-digit code), likes, ratings, and email-updates opt-in.

- Live API: `https://api.collierentertainment.com`
- D1 database: `collier-users` (`b158ce3b-6efe-40ea-a51c-dffb5baab025`)
- Secrets (set in Cloudflare, not in this repo): `RESEND_API_KEY`, optional `ADMIN_TOKEN`

## Deploy

```bash
cd worker
npx wrangler deploy
```

Apply schema only when creating a new database:

```bash
npx wrangler d1 execute collier-users --file=schema.sql --remote
```

Do not commit secrets. The live site and app already use this worker; this folder is the source of truth for the deployed code.
