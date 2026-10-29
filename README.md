# Learn English

Standalone English vocabulary app: daily spaced review (Tổng hợp), ungraded practice and graded tests per word set (Luyện tập), and a daily task overview (Tổng quan).

## Local development

1. Copy `.env.example` to `.env.local` and set PostgreSQL, MongoDB, Auth.js, and Google OAuth values.
2. Run `npm ci`.
3. Run `npx prisma migrate deploy`, then `npm run db:seed:samples` for the sample word sets.
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

The app container applies committed Prisma migrations before starting.

Point nginx or Caddy at port 3002 and terminate TLS there. Keep PostgreSQL and MongoDB private to the Compose network.

## Data migration

See [`docs/migration.md`](docs/migration.md). Content can be copied independently because the `En*` schema has no relation to Chinese tables. Learner progress should only be copied together with MongoDB user IDs.

### Audio prerequisites

Local macOS: `brew install ffmpeg`. Production Docker installs ffmpeg in the runner image. `TTS_FORMAT=opus` is the default; set `TTS_FORMAT=wav` to use WAV, and `FFMPEG_BIN` to override the encoder path. When ffmpeg is unavailable, the server serves WAV. `TTS_SWEEP_ON_BOOT=1` queues published sets for audio preparation 60 seconds after the Node server starts. On a VPS, install ffmpeg and check available CPU before enabling the sweep.
