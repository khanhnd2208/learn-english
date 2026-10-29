# Local load and PostgreSQL parity tests

These commands refuse remote databases and names without `_load` / `_test`. They do not load `.env.local`. Never point them at learner data. Use a disposable local PostgreSQL instance and provision the two databases before running migrations.

```sh
export DATABASE_URL='postgresql://localhost/learn_english_load'
npx prisma migrate deploy --config scripts/prisma-test.config.ts
npm run db:seed:load -- --users 200 --sets 10 --words 500 --days 90 --seed 42
PG_POOL_MAX=5 npm run bench -- --concurrency 1,25,50,100,200 --scenario all --out docs/testing/load-baseline.md
TEST_DATABASE_URL='postgresql://localhost/learn_english_test' npm run test:db
```

`--truncate` clears **all En tables in the guarded disposable target** before seeding. Reseed before comparing revisions: round benchmarks save answers, schedules and rewards. Each level is one worst-case wave with a distinct user per worker. Measurements are service timings, Prisma operation counts (not wire SQL statements), JSON sizes and process memory sampled every 200 ms. Small waves have few samples; these are diagnostic measurements, not a production capacity guarantee. TTS warming follows configured server availability; record the TTS environment when comparing runs.

`test:db` skips with exit 0 when `TEST_DATABASE_URL` is absent, rejects unsafe values, and migrates once per Vitest invocation through a separate config. The normal `prisma.config.ts` reads `.env.local` with `override: true`; the guarded config intentionally does not, so test migrations cannot be redirected by developer settings.

The seed's 0–250 answers/day is a synthetic workload distribution. It is **not an application limit**. As clarified by the owner, learners may start any number of rounds while words remain; each round holds at most 50 words. Seed days can therefore contain five sessions. Histories and timestamps are reproducible for the same seed and supplied clock; the CLI anchors them to its run date.

Frozen pre-optimization service bodies live in `src/lib/__dbtests__/legacy/`. Only import wiring and exports for private oracle functions differ. Their schedule and question builders are frozen too. They must never be updated to match a new implementation.

For production pool tuning, the owner should check `SHOW max_connections` and the connection budgets of all four apps sharing the VPS before raising `PG_POOL_MAX`. The production default is 10 after PR3. Consider PM2 `max_memory_restart: '1200M'` after inspecting actual memory headroom. These are deployment recommendations; the load scripts never connect to or configure the VPS. Slow API calls log only method, pathname and duration after `SLOW_REQUEST_MS` (default 1000).
