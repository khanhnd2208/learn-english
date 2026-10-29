# Service load benchmark

Date: 2026-10-29T17:27:40.196Z
Host: darwin 25.6.0, Apple M5 Pro, 15 CPUs, 24.0 GiB RAM
Node: v22.22.3; PG_POOL_MAX=10
Implementation: current services. Local service calls, no HTTP/auth/network latency or think-time. One wave per level; not a production capacity guarantee.
Each level mutates its own learners for round scenarios. Reseed before comparing revisions. React cache is inactive outside RSC.

| Concurrency | Operation | N | p50 ms | p95 ms | max ms | Prisma ops avg | JSON max bytes | Errors |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | startToday | 1 | 28.9 | 28.9 | 28.9 | 4.0 | 54391 | 0 |
| 1 | answerToday+settleProgress | 50 | 58.1 | 65.1 | 90.9 | 15.8 | 277 | 0 |
| 1 | finishToday | 1 | 12.7 | 12.7 | 12.7 | 5.0 | 103 | 0 |

Peak RSS: 2311.7 MiB; peak heapUsed: 93.6 MiB.
Guided answers use real server time and no think-time, so pacing may withhold XP. SRS advances its injected server clock by 4 seconds per answer.
