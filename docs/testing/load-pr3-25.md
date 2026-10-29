# Service load benchmark

Date: 2026-10-29T17:28:21.696Z
Host: darwin 25.6.0, Apple M5 Pro, 15 CPUs, 24.0 GiB RAM
Node: v22.22.3; PG_POOL_MAX=10
Implementation: current services. Local service calls, no HTTP/auth/network latency or think-time. One wave per level; not a production capacity guarantee.
Each level mutates its own learners for round scenarios. Reseed before comparing revisions. React cache is inactive outside RSC.

| Concurrency | Operation | N | p50 ms | p95 ms | max ms | Prisma ops avg | JSON max bytes | Errors |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 25 | startToday | 25 | 169.2 | 184.5 | 188.6 | 4.0 | 54627 | 0 |
| 25 | answerToday+settleProgress | 1250 | 1443.0 | 2049.8 | 2865.0 | 15.8 | 277 | 0 |
| 25 | finishToday | 25 | 606.6 | 1432.3 | 1471.5 | 5.0 | 104 | 0 |

Peak RSS: 5830.2 MiB; peak heapUsed: 168.2 MiB.
Guided answers use real server time and no think-time, so pacing may withhold XP. SRS advances its injected server clock by 4 seconds per answer.
