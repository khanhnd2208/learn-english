# HTTP load benchmark (local-flash)

Date: 2026-10-30T06:33:04.560Z
Base URL: http://localhost:3102/
Users: 200; think-ms: 4000; ramp-ms: 0; seed: 42.
Measured end to end over HTTP, including auth, React Server Components and React cache.

| Step | N | p50 ms | p95 ms | max ms | Errors |
|---|---:|---:|---:|---:|---:|
| home | 400 | 34.0 | 2810.7 | 2886.6 | 0 |
| daily/start | 200 | 620.1 | 909.9 | 953.4 | 0 |
| daily/answer | 5870 | 8.8 | 15.9 | 31.8 | 0 |
| daily/finish | 200 | 5.9 | 11.8 | 22.1 | 0 |
| review page | 200 | 11.0 | 20.7 | 37.6 | 0 |
| review/start | 200 | 29.0 | 44.7 | 51.7 | 0 |
| review/study | 600 | 3.6 | 8.2 | 22.5 | 0 |
| review/answer | 3000 | 8.8 | 15.9 | 34.6 | 0 |
| review/next | 400 | 7.0 | 11.3 | 21.0 | 0 |
| review/finish | 200 | 2.8 | 5.5 | 7.2 | 0 |

Total run time: 211.3 s; answer requests per second: 41.97 (8870 successful daily/answer and review/answer requests).

## Notes

Peak observed server RSS: 432.0 MiB (39 external `ps` samples at 5-second intervals). Machine CPU busy during the run: 15.8–38.6% (sampled with `top`); peak server process CPU: 208.0% across cores. The database was reseeded with the same parameters before this flash run.
