# Service load benchmark

Date: 2026-10-29T18:37:40.819Z
Host: darwin 25.6.0, Apple M5 Pro, 15 CPUs, 24.0 GiB RAM
Node: v22.22.3; PG_POOL_MAX=10
Implementation: current services. Local service calls, no HTTP/auth/network latency. One wave per level; not a production capacity guarantee.
Think time: none (every learner answers back to back).
Each level mutates its own learners for round scenarios. Reseed before comparing revisions. React cache is inactive outside RSC.

| Concurrency | Operation | N | p50 ms | p95 ms | max ms | Prisma ops avg | JSON max bytes | Errors |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | overview+goals | 1 | 60.4 | 60.4 | 60.4 | 39.0 | 7100 | 0 |
| 1 | startToday | 1 | 12.7 | 12.7 | 12.7 | 4.0 | 54380 | 0 |
| 1 | answerToday+settleProgress | 50 | 8.3 | 11.3 | 15.6 | 15.9 | 319 | 0 |
| 1 | finishToday | 1 | 8.4 | 8.4 | 8.4 | 5.0 | 103 | 0 |
| 1 | startGuidedReview | 1 | 135.8 | 135.8 | 135.8 | 13.0 | 9532 | 0 |
| 1 | saveStudyPosition | 3 | 1.6 | 2.3 | 2.3 | 6.0 | 9531 | 0 |
| 1 | answerGuidedReview+settleProgress | 15 | 7.2 | 9.3 | 9.3 | 20.1 | 10064 | 0 |
| 1 | nextGuidedChunk | 2 | 19.5 | 20.4 | 20.4 | 11.0 | 9518 | 0 |
| 1 | finishGuidedReview | 1 | 1.8 | 1.8 | 1.8 | 3.0 | 11 | 0 |
| 1 | catalog | 1 | 4.2 | 4.2 | 4.2 | 2.0 | 2453 | 0 |
| 25 | overview+goals | 25 | 283.6 | 285.9 | 286.1 | 38.3 | 7109 | 0 |
| 25 | startToday | 25 | 55.4 | 68.8 | 70.3 | 4.0 | 54654 | 0 |
| 25 | answerToday+settleProgress | 1250 | 92.6 | 117.0 | 150.9 | 15.8 | 277 | 0 |
| 25 | finishToday | 25 | 39.4 | 75.7 | 79.4 | 5.0 | 104 | 0 |
| 25 | startGuidedReview | 25 | 628.6 | 978.0 | 1133.3 | 13.0 | 9615 | 0 |
| 25 | saveStudyPosition | 75 | 62.4 | 85.3 | 89.3 | 6.0 | 9621 | 0 |
| 25 | answerGuidedReview+settleProgress | 375 | 97.8 | 141.7 | 160.2 | 20.1 | 10168 | 0 |
| 25 | nextGuidedChunk | 50 | 141.7 | 740.8 | 816.3 | 11.0 | 9622 | 0 |
| 25 | finishGuidedReview | 25 | 8.8 | 26.9 | 46.8 | 3.0 | 11 | 0 |
| 25 | catalog | 25 | 12.9 | 16.1 | 16.1 | 2.0 | 2471 | 0 |
| 50 | overview+goals | 50 | 271.2 | 415.4 | 415.7 | 30.5 | 7108 | 0 |
| 50 | startToday | 50 | 107.2 | 131.4 | 133.7 | 4.0 | 54758 | 0 |
| 50 | answerToday+settleProgress | 2500 | 198.9 | 234.3 | 277.3 | 15.8 | 318 | 0 |
| 50 | finishToday | 50 | 94.6 | 160.5 | 167.1 | 5.0 | 104 | 0 |
| 50 | startGuidedReview | 50 | 1118.1 | 2019.6 | 2184.0 | 13.0 | 9608 | 0 |
| 50 | saveStudyPosition | 150 | 81.9 | 111.4 | 114.9 | 6.0 | 9607 | 0 |
| 50 | answerGuidedReview+settleProgress | 750 | 135.9 | 167.3 | 199.8 | 20.0 | 10181 | 0 |
| 50 | nextGuidedChunk | 100 | 933.5 | 1744.5 | 1842.6 | 11.0 | 9602 | 0 |
| 50 | finishGuidedReview | 50 | 23.5 | 45.3 | 48.9 | 3.0 | 11 | 0 |
| 50 | catalog | 50 | 18.8 | 25.5 | 26.3 | 2.0 | 2471 | 0 |
| 100 | overview+goals | 100 | 560.7 | 862.0 | 863.1 | 30.5 | 7109 | 0 |
| 100 | startToday | 100 | 199.5 | 255.7 | 260.9 | 4.0 | 54788 | 0 |
| 100 | answerToday+settleProgress | 5000 | 410.0 | 446.2 | 594.4 | 15.7 | 319 | 0 |
| 100 | finishToday | 100 | 189.9 | 316.4 | 335.9 | 5.0 | 104 | 0 |
| 100 | startGuidedReview | 100 | 2249.0 | 4179.5 | 4353.1 | 13.0 | 9585 | 0 |
| 100 | saveStudyPosition | 300 | 84.3 | 115.3 | 141.1 | 6.0 | 9607 | 0 |
| 100 | answerGuidedReview+settleProgress | 1500 | 142.0 | 174.7 | 190.7 | 20.2 | 10168 | 0 |
| 100 | nextGuidedChunk | 200 | 2797.1 | 3816.3 | 4099.3 | 11.0 | 9608 | 0 |
| 100 | finishGuidedReview | 100 | 32.7 | 50.4 | 59.8 | 3.0 | 11 | 0 |
| 100 | catalog | 100 | 36.2 | 49.8 | 50.6 | 2.0 | 2471 | 0 |
| 200 | overview+goals | 200 | 1143.3 | 1750.4 | 1752.5 | 30.5 | 7111 | 0 |
| 200 | startToday | 200 | 390.2 | 501.0 | 512.4 | 4.0 | 54728 | 0 |
| 200 | answerToday+settleProgress | 10000 | 841.1 | 882.6 | 1044.0 | 15.7 | 319 | 0 |
| 200 | finishToday | 200 | 405.2 | 643.9 | 675.8 | 5.0 | 104 | 0 |
| 200 | startGuidedReview | 200 | 4521.4 | 8597.6 | 9002.9 | 13.0 | 9619 | 0 |
| 200 | saveStudyPosition | 600 | 87.6 | 121.7 | 137.7 | 6.0 | 9618 | 0 |
| 200 | answerGuidedReview+settleProgress | 3000 | 147.4 | 181.9 | 215.7 | 20.2 | 10196 | 0 |
| 200 | nextGuidedChunk | 400 | 6653.8 | 8280.9 | 8763.6 | 11.0 | 9610 | 0 |
| 200 | finishGuidedReview | 200 | 34.5 | 56.7 | 74.0 | 3.0 | 11 | 0 |
| 200 | catalog | 200 | 62.8 | 89.4 | 92.1 | 2.0 | 2471 | 0 |

Peak RSS: 661.1 MiB; peak heapUsed: 386.7 MiB.
Guided answers use real server time, so pacing may withhold XP without think time. SRS advances its injected server clock by 4 seconds per answer.
