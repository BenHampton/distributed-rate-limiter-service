# Rate Limiter Service

A distributed API rate limiter as a service. Built in TypeScript + Fastify, backed by Redis with atomic Lua scripts, with two swappable limiting algorithms and a live WebSocket metrics counter.

The point of the project: rate limiting that stays **correct under concurrency** even when multiple instances run behind a load balancer, with the algorithm kept as a swappable detail behind a clean interface.

---

## Running locally

1. start redis:
2. install and build
3. start app

The server logs that it's listening on `:3000`. `npm run dev`

### Websocket
1. https://websocketking.com/
2. connect using: `ws://localhost:3000/ws/metrics`
3. send requests

---

## Architecture

```
client ──▶ Fastify ──▶ rateLimit plugin ──▶ Limiter (strategy)
                                              │
                          ┌───────────────────┴───────────────────┐
                          ▼                                       ▼
                 TokenBucketStrategy                  SlidingWindowStrategy
                          │                                       │
                          └───────────────┬───────────────────────┘
                                          ▼
                                 RedisStore ── EVALSHA ──▶ atomic Lua
                                          │
                                          ▼
                                   MetricsBus (EventEmitter)
                                          │
                                          ▼
                               WebSocket ──▶ live counter

```

### Project structure

```
rateguard/
├── src/
│   ├── core/
│   │   ├── types.ts           # shared contracts (RateLimitResult)
│   │   ├── config.ts          # env parsing + validation (zod)
│   │   └── metrics.ts         # EventEmitter metrics bus
│   ├── store/
│   │   ├── store.ts           # Store interface
│   │   ├── redis-store.ts     # Redis + Lua impl
│   │   └── memory-store.ts    # in-memory impl (tests)
│   ├── strategies/
│   │   ├── strategy.ts        # RateLimitStrategy interface
│   │   ├── factory.ts         # picks strategy from config
│   │   ├── lua.ts             # both Lua scripts as strings
│   │   ├── token-bucket.ts    # algorithm 1
│   │   └── sliding-window.ts  # algorithm 2
│   ├── plugins/
│   │   └── rate-limit.ts      # Fastify plugin
│   ├── ws/
│   │   └── counter.ts         # live WS counter
│   └── server.ts              # bootstrap
├── test/
│   ├── unit/                  # algorithm logic, in-memory store
│   └── integration/           # concurrency correctness vs real Redis
├── load/
│   └── bench.js               # autocannon benchmark
├── docker-compose.yml
├── Dockerfile
├── tsconfig.json
└── package.json
```

---

## Requirements

- **Node.js** 22+
- **Redis** 7+ (local install or Docker)
- **Docker** + Docker Compose (optional, for the containerized path)

---

## Configuration

All config is read from the environment at boot and validated with zod — the process exits immediately if anything is invalid.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `RATE_ALGO` | `token-bucket` | `token-bucket` or `sliding-window` |
| `RATE_LIMIT` | `10` | Requests allowed per window |
| `RATE_WINDOW_MS` | `1000` | Window length in milliseconds |

---

## Running with Docker Compose

This brings up Redis and the app together, healthchecked, in one command:

```bash
docker compose up --build
```

- App: `http://localhost:3000`
- Redis: `localhost:6379`

The Compose file sets `RATE_LIMIT=100` and wires the app to Redis via `REDIS_URL=redis://redis:6379`. Edit `docker-compose.yml` to change the algorithm or limits.

Tear down with:

```bash
docker compose down
```

---

## Trying it out

- Health check: GET `localhost:3000/health`
- rate-limited request GET: `localhost:3000/api/resource`
```
200 OK
// Response Headers:
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
```
- trip rate limit: call rate-limited most than RATE_LIMIT before initial request passes time frame (RATE_WINDOW_MS)
- Use the **Collection Runner** with ~20 iterations and 0ms delay to fire a burst and watch responses flip from `200` to `429`.

Start with `RATE_LIMIT=5` so the limit is easy to hit by hand, and run `redis-cli flushall` between manual runs to clear leftover state.

## Watch the live counter** over WebSocket:

```bash
npx wscat -c ws://localhost:3000/ws/metrics
# → {"allowed":100,"throttled":20,"total":120}   (updates every 500ms)
```

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check; returns `{"ok":true}` |
| `GET` | `/api/resource` | Example protected endpoint; rate limited |
| `WS` | `/ws/metrics` | Streams `{allowed, throttled, total}` every 500ms |

**Rate-limit response headers** (on `/api/resource`):

| Header | Meaning |
|--------|---------|
| `X-RateLimit-Limit` | Configured limit for the window |
| `X-RateLimit-Remaining` | Tokens/slots left |
| `Retry-After` | Seconds to wait (only on `429`) |
