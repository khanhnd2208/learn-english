# Service load benchmark

Date: 2026-10-29T17:30:52.980Z
Host: darwin 25.6.0, Apple M5 Pro, 15 CPUs, 24.0 GiB RAM
Node: v22.22.3; PG_POOL_MAX=10
Implementation: current services. Local service calls, no HTTP/auth/network latency or think-time. One wave per level; not a production capacity guarantee.
Each level mutates its own learners for round scenarios. Reseed before comparing revisions. React cache is inactive outside RSC.

| Concurrency | Operation | N | p50 ms | p95 ms | max ms | Prisma ops avg | JSON max bytes | Errors |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | overview+goals | 1 | 96.9 | 96.9 | 96.9 | 22.0 | 7102 | 0 |
| 25 | overview+goals | 25 | 1310.6 | 1534.2 | 1534.5 | 22.0 | 7108 | 0 |
| 50 | overview+goals | 50 | 3128.0 | 3134.2 | 3231.9 | 22.0 | 7108 | 0 |
| 100 | overview+goals | 100 | 6751.3 | 6760.9 | 6762.4 | 22.0 | 7109 | 0 |
| 200 | overview+goals | 200 | 12919.5 | 14875.7 | 14878.4 | 24.3 | 7111 | 0 |

Peak RSS: 8069.4 MiB; peak heapUsed: 222.8 MiB.
Guided answers use real server time and no think-time, so pacing may withhold XP. SRS advances its injected server clock by 4 seconds per answer.

## Scope and acceptance

This is the final integrated **overview** wave, not a complete all-scenario wave. The full pre-optimization baseline stopped at 25 learners when RSS exceeded 8.7 GiB; its overview p95 was 21,614.6 ms with 32 Prisma operations per learner (and `PG_POOL_MAX=5`). The integrated implementation measured 1,534.2 ms and 22 operations at 25 learners with `PG_POOL_MAX=10`. These are observations under different pool settings, not a controlled attribution to one PR. At 200 learners the integrated overview p95 was 14,875.7 ms with no errors. Peak heap met the 600 MiB goal, but process RSS reached 8,069.4 MiB, above the shared VPS's approximately 7.8 GB RAM.

The SRS round was measured separately at concurrency 25 in [load-pr3-25.md](load-pr3-25.md): 1,250 answer-and-settle operations had p95 2,049.8 ms, 15.8 Prisma operations on average, and no errors. `startToday` payload was 54,627 bytes, below 150 KB. This already fails the 300 ms p95 acceptance threshold at 25 learners, so the 200-learner SRS target is **unmet and unverified**. A 200-learner SRS run was not attempted on this host after the baseline and overview waves exceeded the target VPS memory budget. Guided round was measured at concurrency 1 in [load-pr5.md](load-pr5.md); catalog was measured through concurrency 200 in [load-pr7.md](load-pr7.md). Those measurements do not establish 200-learner guided capacity.

Do not merge or deploy based on this local run. Recheck on a dedicated staging host with production-equivalent memory and representative HTTP traffic, then address SRS latency and RSS before accepting the 200-learner target.
