# HTTP load benchmark (local)

Date: 2026-10-30T06:24:59.930Z
Base URL: http://localhost:3102/
Users: 200; think-ms: 4000; ramp-ms: 60000; seed: 42.
Measured end to end over HTTP, including auth, React Server Components and React cache.

| Step | N | p50 ms | p95 ms | max ms | Errors |
|---|---:|---:|---:|---:|---:|
| home | 400 | 17.6 | 31.2 | 400.5 | 0 |
| daily/start | 200 | 6.3 | 9.9 | 24.2 | 0 |
| daily/answer | 5870 | 9.1 | 15.9 | 62.1 | 0 |
| daily/finish | 200 | 6.4 | 11.0 | 33.4 | 0 |
| review page | 200 | 10.9 | 18.1 | 30.9 | 0 |
| review/start | 200 | 40.6 | 49.5 | 74.5 | 0 |
| review/study | 600 | 3.8 | 6.9 | 15.0 | 0 |
| review/answer | 3000 | 9.6 | 16.4 | 46.1 | 0 |
| review/next | 400 | 7.5 | 11.6 | 25.3 | 0 |
| review/finish | 200 | 2.9 | 5.6 | 9.5 | 0 |

Total run time: 255.4 s; answer requests per second: 34.72 (8870 successful daily/answer and review/answer requests).

## Notes

Peak observed server RSS: 354.2 MiB (47 external `ps` samples at 5-second intervals). Machine CPU busy during the run: 16.3–35.1% (sampled with `top`); peak server process CPU: 81.1% of one core.
