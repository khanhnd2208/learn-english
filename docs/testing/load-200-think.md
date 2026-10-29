# Service load benchmark

Date: 2026-10-29T18:29:47.252Z
Host: darwin 25.6.0, Apple M5 Pro, 15 CPUs, 24.0 GiB RAM
Node: v22.22.3; PG_POOL_MAX=10
Implementation: current services. Local service calls, no HTTP/auth/network latency. One wave per level; not a production capacity guarantee.
Think time: 4000 ms ±50% between answers.
Each level mutates its own learners for round scenarios. Reseed before comparing revisions. React cache is inactive outside RSC.

| Concurrency | Operation | N | p50 ms | p95 ms | max ms | Prisma ops avg | JSON max bytes | Errors |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 200 | overview+goals | 200 | 2387.7 | 2411.1 | 2413.3 | 39.0 | 7111 | 0 |
| 200 | startToday | 200 | 417.0 | 508.5 | 518.4 | 4.0 | 54781 | 0 |
| 200 | answerToday+settleProgress | 10000 | 12.8 | 20.9 | 103.4 | 15.8 | 319 | 0 |
| 200 | finishToday | 200 | 8.0 | 12.0 | 15.9 | 5.0 | 104 | 0 |
| 200 | startGuidedReview | 200 | 3476.1 | 6756.7 | 7050.5 | 13.0 | 9607 | 0 |
| 200 | saveStudyPosition | 600 | 2.3 | 20.5 | 33.6 | 6.0 | 9608 | 0 |
| 200 | answerGuidedReview+settleProgress | 3000 | 13.6 | 29.7 | 103.0 | 21.1 | 10188 | 0 |
| 200 | nextGuidedChunk | 400 | 24.1 | 45.3 | 56.2 | 11.0 | 9609 | 0 |
| 200 | finishGuidedReview | 200 | 1.5 | 5.9 | 13.1 | 3.0 | 11 | 0 |
| 200 | catalog | 200 | 92.8 | 119.4 | 121.6 | 2.0 | 2471 | 0 |

Peak RSS: 594.3 MiB; peak heapUsed: 344.3 MiB.
Guided answers use real server time, so pacing may withhold XP without think time. SRS advances its injected server clock by 4 seconds per answer.
