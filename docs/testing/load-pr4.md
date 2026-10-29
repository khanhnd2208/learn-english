# Service load benchmark

Date: 2026-10-29T17:26:45.201Z
Host: darwin 25.6.0, Apple M5 Pro, 15 CPUs, 24.0 GiB RAM
Node: v22.22.3; PG_POOL_MAX=10
Implementation: current services. Local service calls, no HTTP/auth/network latency or think-time. One wave per level; not a production capacity guarantee.
Each level mutates its own learners for round scenarios. Reseed before comparing revisions. React cache is inactive outside RSC.

| Concurrency | Operation | N | p50 ms | p95 ms | max ms | Prisma ops avg | JSON max bytes | Errors |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | startToday | 1 | 32.0 | 32.0 | 32.0 | 4.0 | 54090 | 0 |
| 1 | answerToday+settleProgress | 50 | 45.9 | 48.9 | 82.0 | 21.8 | 277 | 0 |
| 1 | finishToday | 1 | 9.8 | 9.8 | 9.8 | 5.0 | 103 | 0 |

Peak RSS: 3420.0 MiB; peak heapUsed: 90.9 MiB.
Guided answers use real server time and no think-time, so pacing may withhold XP. SRS advances its injected server clock by 4 seconds per answer.
