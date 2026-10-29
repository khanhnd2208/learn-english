# Final load check (200 learners)

Date: 2026-10-30. Host: Apple M5 Pro, Node v22.22.3, local PostgreSQL 5433, `PG_POOL_MAX=10`, `NODE_OPTIONS=--max-old-space-size=512`.
Data: `db:seed:load --users 200 --sets 10 --words 500 --days 90 --seed 42` (2.68M reviews, 2.68M XP events, 483k word states), restored from one dump and `ANALYZE`d before every run.

Raw tables: [load-200-think.md](load-200-think.md) (realistic pacing) and [load-burst.md](load-burst.md) (no pause between answers, 1–200 learners).

## Result

With learners pausing about 4 s between answers (2–6 s, `--think-ms 4000`), 200 learners at once:

| Operation | p95 ms | Target |
|---|---:|---|
| SRS answer + reward settle | 20.9 | < 300 ✓ |
| Guided answer + reward settle | 29.7 | |
| Next guided chunk | 45.3 | |
| Library (catalog) | 119.4 | |
| Start SRS round (all 200 in the same instant) | 508.5 | |
| Home overview + goals (all 200 in the same instant) | 2,411 | |
| Start guided review (all 200 in the same instant) | 6,757 | |

Peak RSS 594 MiB, peak heap 344 MiB, no errors. This fits under PM2 `max_memory_restart: 768M` **only if** the process runs with `--max-old-space-size=512` (see Deploy). Without a heap cap V8 lets garbage pile up to ~2 GiB before collecting, which PM2 reads as a leak and restarts.

The three "same instant" rows are a flash crowd: every learner starts on the same millisecond. Guided starts are deliberately queued four at a time (`createLimiter(4)` in `enGuidedReviewService`) because each build holds the whole selection in memory; spread over a minute they take ~140 ms each.

## What was wrong in the earlier report

The previous final report (p95 2,050 ms for SRS at 25 learners, RSS 8 GiB) had two causes, neither in PostgreSQL:

1. **`studyDayKey` built a new `Intl.DateTimeFormat` on every call.** Reward settling keys every review of the week by Vietnam day, so one answer created thousands of ICU formatters. A CPU profile showed 10.6 s of 14 s in this function, and the native ICU objects explain the 5–8 GiB RSS with a 200 MiB heap. Vietnam has been fixed at +07:00 since 1975 (`vnDayStart` already assumes it), so the key is now plain arithmetic; a test compares it with `Intl` every 37 minutes across two years.
   SRS at 25 learners, no pause: p95 2,068 → 117 ms; RSS 5.9 GiB → 430 MiB.
2. **The benchmarks ran without planner statistics.** The seed bulk-inserts and the bench ran straight after, so the live-word join picked a nested loop (150 ms instead of 20–40 ms) and ran six times per overview. The seed now ends with `ANALYZE`. Overview at 200, no pause: p95 14,876 → 1,750 ms.

Further fixes in this pass:

- `chooseDistractors` filtered and fully sorted the whole pool (up to 4,000 words) with `localeCompare` and regexes for every question. It now caches each entry's normalized keys and keeps only the top 8 with a shared `Intl.Collator`; a test checks the output equals the old stable sort.
- `getDistractorPool` sends one array parameter and joins the lemma in SQL instead of 4,000 bound parameters and a second query.
- Guided session writes and reads select only the columns they use, instead of parsing the 4,000-id `poolSenseIds` / `remainingSenseIds` arrays back after every answer.
- Guided transactions use the shared `EN_TX_TIMEOUT_MS` / `EN_TX_MAX_WAIT_MS`; at 200 learners the 2 s Prisma default made 79 `nextGuidedChunk` calls fail.
- The load seed now backfills `EnStudyDay` the same way the migration does, so streak reads see history.

## Burst (no pause between answers)

Every learner answers back to back, which is many times real traffic. The single Node process is CPU-bound here, so latency grows linearly with learners and nothing fails:

| Learners | SRS answer p95 | Guided answer p95 | Overview p95 |
|---:|---:|---:|---:|
| 1 | 11 | 9 | 60 |
| 25 | 117 | 142 | 286 |
| 100 | 446 | 175 | 862 |
| 200 | 883 | 182 | 1,750 |

At 200 learners the server sustains about 240 SRS answers per second; 200 real learners produce about 30–50.

## Deploy

- PM2 for learn-english: `node_args: '--max-old-space-size=512'` with `max_memory_restart: '768M'`.
- `PG_POOL_MAX` defaults to 10; check the VPS `max_connections` against the other apps before raising it.
- Without `ffmpeg` on the VPS, speech stays WAV exactly as before; with it, new speech is cached as Opus (MP3 for browsers without Opus).

## Not covered

Local service calls only: no HTTP, auth or network, and a faster CPU than the 4-vCPU VPS shared with three other apps. Expect the VPS to be slower per request; the pacing headroom (about 5x) is the margin.
