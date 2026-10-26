# Learn English

Standalone English vocabulary, practice, testing, and progress app split from `learn-chinese`.

## Local development

1. Copy `.env.example` to `.env.local` and set PostgreSQL, MongoDB, Auth.js, and Google OAuth values.
2. Run `npm ci`.
3. Run `npx prisma migrate deploy` and `npm run db:seed`.
4. Run `npm run dev`; the app listens on <http://localhost:3002>.

Google OAuth must allow `http://localhost:3002/api/auth/callback/google` locally and `https://YOUR_ENGLISH_DOMAIN/api/auth/callback/google` in production.

## Quality

```bash
npm run quality
```

## Docker

Create a non-committed `.env` with strong database and Auth.js secrets, then run:

```bash
docker compose up --build
```

The app container applies committed Prisma migrations before starting. Seed the activity catalog once with `npm run db:seed` from a configured checkout.

Point nginx or Caddy at port 3002 and terminate TLS there. Keep PostgreSQL and MongoDB private to the Compose network.

## Data migration

See [`docs/migration.md`](docs/migration.md). Content can be copied independently because the `En*` schema has no relation to Chinese tables. Learner progress should only be copied together with MongoDB user IDs.
