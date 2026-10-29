# Service load benchmark

Date: 2026-10-29T17:24:10.706Z
Host: darwin 25.6.0, Apple M5 Pro, 15 CPUs, 24.0 GiB RAM
Node: v22.22.3; PG_POOL_MAX=5
Implementation: frozen pre-optimization oracle. Local service calls, no HTTP/auth/network latency or think-time. One wave per level; not a production capacity guarantee.
Each level mutates its own learners for round scenarios. Reseed before comparing revisions. React cache is inactive outside RSC.

| Concurrency | Operation | N | p50 ms | p95 ms | max ms | Prisma ops avg | JSON max bytes | Errors |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | overview+goals | 1 | 826.9 | 826.9 | 826.9 | 32.0 | 7103 | 0 |
| 25 | overview+goals | 25 | 21006.8 | 21614.6 | 21671.2 | 32.0 | 7107 | 0 |

Peak RSS: 7917.6 MiB; peak heapUsed: 331.9 MiB.
Guided answers use real server time and no think-time, so pacing may withhold XP. SRS advances its injected server clock by 4 seconds per answer.

The guarded seed completed in 417.0 s with 200 learners, 10 sets × 500 senses, 20,000 examples, 483,000 word states, 2,675,427 reviews, 2,675,427 XP events, 4,000 guided sessions and 80,000 guided questions. The database was `learn_english_load` on local PostgreSQL port 55432.

The full baseline wave was stopped after concurrency 25 because the frozen implementation's RSS reached about 8.7 GiB before the 50-user scenario completed. Even the isolated overview wave peaked at 7,917.6 MiB at 25 users, above the 7.8 GB shared VPS RAM. Values for 50, 100 and 200 are intentionally absent; extrapolating them would hide a measured capacity failure. SRS and guided round operations were exercised at concurrency 1 during the stopped wave but that partial run did not produce a saved metrics table. Re-run against a larger dedicated machine if complete high-concurrency baseline numbers are needed.
