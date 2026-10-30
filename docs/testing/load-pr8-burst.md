# Service load benchmark

Comparison: at 200 learners, `answerToday+settleProgress` p95 is 434.2 ms (0 errors), down from 882.6 ms in `load-burst.md` (448.4 ms, 50.8% lower).

Date: 2026-10-30T06:07:08.065Z
Host: darwin 25.6.0, Apple M5 Pro, 15 CPUs, 24.0 GiB RAM
Node: v22.22.3; PG_POOL_MAX=10
Implementation: current services. Local service calls, no HTTP/auth/network latency. One wave per level; not a production capacity guarantee.
Think time: none (every learner answers back to back).
Each level mutates its own learners for round scenarios. Reseed before comparing revisions. React cache is inactive outside RSC.

| Concurrency | Operation | N | p50 ms | p95 ms | max ms | Prisma ops avg | JSON max bytes | Errors |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 200 | startToday | 200 | 755.0 | 899.6 | 914.9 | 4.0 | 54780 | 0 |
| 200 | answerToday+settleProgress | 10000 | 363.0 | 434.2 | 968.3 | 16.8 | 2335 | 0 |
| 200 | finishToday | 200 | 183.3 | 193.5 | 197.3 | 5.0 | 104 | 0 |

Peak RSS: 384.7 MiB; peak heapUsed: 123.4 MiB.
Guided answers use real server time, so pacing may withhold XP without think time. SRS advances its injected server clock by 4 seconds per answer.
