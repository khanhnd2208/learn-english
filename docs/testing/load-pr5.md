# Service load benchmark

Date: 2026-10-29T17:30:34.525Z
Host: darwin 25.6.0, Apple M5 Pro, 15 CPUs, 24.0 GiB RAM
Node: v22.22.3; PG_POOL_MAX=10
Implementation: current services. Local service calls, no HTTP/auth/network latency or think-time. One wave per level; not a production capacity guarantee.
Each level mutates its own learners for round scenarios. Reseed before comparing revisions. React cache is inactive outside RSC.

| Concurrency | Operation | N | p50 ms | p95 ms | max ms | Prisma ops avg | JSON max bytes | Errors |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | startGuidedReview | 1 | 131.7 | 131.7 | 131.7 | 13.0 | 9563 | 0 |
| 1 | saveStudyPosition | 3 | 1.8 | 3.5 | 3.5 | 6.0 | 9562 | 0 |
| 1 | answerGuidedReview+settleProgress | 15 | 58.9 | 74.4 | 74.4 | 20.0 | 10042 | 0 |
| 1 | nextGuidedChunk | 2 | 33.9 | 43.5 | 43.5 | 11.0 | 9544 | 0 |
| 1 | finishGuidedReview | 1 | 7.1 | 7.1 | 7.1 | 3.0 | 11 | 0 |

Peak RSS: 1475.1 MiB; peak heapUsed: 85.3 MiB.
Guided answers use real server time and no think-time, so pacing may withhold XP. SRS advances its injected server clock by 4 seconds per answer.
