# Service load benchmark

Date: 2026-10-29T17:30:12.580Z
Host: darwin 25.6.0, Apple M5 Pro, 15 CPUs, 24.0 GiB RAM
Node: v22.22.3; PG_POOL_MAX=10
Implementation: current services. Local service calls, no HTTP/auth/network latency or think-time. One wave per level; not a production capacity guarantee.
Each level mutates its own learners for round scenarios. Reseed before comparing revisions. React cache is inactive outside RSC.

| Concurrency | Operation | N | p50 ms | p95 ms | max ms | Prisma ops avg | JSON max bytes | Errors |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | catalog | 1 | 10.0 | 10.0 | 10.0 | 2.0 | 2453 | 0 |
| 25 | catalog | 25 | 20.2 | 23.2 | 23.4 | 2.0 | 2471 | 0 |
| 50 | catalog | 50 | 21.1 | 28.0 | 29.3 | 2.0 | 2471 | 0 |
| 100 | catalog | 100 | 35.7 | 61.6 | 62.0 | 2.0 | 2471 | 0 |
| 200 | catalog | 200 | 64.0 | 101.2 | 104.0 | 2.0 | 2471 | 0 |

Peak RSS: 264.2 MiB; peak heapUsed: 48.5 MiB.
Guided answers use real server time and no think-time, so pacing may withhold XP. SRS advances its injected server clock by 4 seconds per answer.
