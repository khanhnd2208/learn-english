# HTTP load benchmark (vps)

Date: 2026-10-30T07:14:24.103Z
Base URL: http://127.0.0.1:3102/
Users: 200; think-ms: 4000; ramp-ms: 60000; seed: 42.
Measured end to end over HTTP, including auth, React Server Components and React cache.

| Step | N | p50 ms | p95 ms | max ms | Errors |
|---|---:|---:|---:|---:|---:|
| home | 400 | 627.5 | 1522.4 | 2314.6 | 0 |
| daily/start | 200 | 178.0 | 1164.1 | 2412.1 | 0 |
| daily/answer | 5870 | 921.3 | 2728.1 | 5052.3 | 0 |
| daily/finish | 200 | 1151.3 | 2271.5 | 2576.5 | 0 |
| review page | 200 | 817.1 | 1362.9 | 2057.7 | 0 |
| review/start | 200 | 16838.5 | 26405.3 | 27102.3 | 0 |
| review/study | 600 | 525.2 | 1750.0 | 2705.9 | 0 |
| review/answer | 3000 | 888.5 | 2606.5 | 4001.4 | 0 |
| review/next | 400 | 8947.3 | 21254.8 | 26817.8 | 0 |
| review/finish | 200 | 137.0 | 467.2 | 586.9 | 0 |

Total run time: 324.7 s; answer requests per second: 27.32 (8870 successful daily/answer and review/answer requests).

## Notes

Peak observed test-server RSS: 325.5 MiB. Peak test-server process CPU: 98.3% of one core. VPS CPU busy ranged from 1.5% to 99.5% across 70 external samples taken every 5 seconds. The test instance used `PG_POOL_MAX=5` and `NODE_OPTIONS=--max-old-space-size=512`; it ran the deployed PR A application code with this PR's benchmark script. Production health remained HTTP 200 after the run. The test instance was stopped, port 3102 freed, and the disposable `learn_english_load` database dropped.
