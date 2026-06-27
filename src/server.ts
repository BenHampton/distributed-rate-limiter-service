import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { loadConfig } from "./core/config.js";
import { RedisStore } from "./store/redis-store.js";
import { makeStrategy } from "./strategies/factory.js";
import { MetricsBus } from "./core/metrics.js";
import rateLimit from "./plugins/rate-limit.js";
import { registerCounter } from "./ws/counter.js";

async function main() {
    const config = loadConfig()
    const store = new RedisStore(config.REDIS_URL)
    const strategy = makeStrategy(config, store)
    const metrics = new MetricsBus()

    const app = Fastify({ logger: true })
    await app.register(websocket)
    await app.register(rateLimit, { strategy, metrics })
    registerCounter(app, metrics)

    app.get('/health', () => ({ ok: true }))
    app.get('/api/resource', () => ({ data: 'ok' }))

    //drain connection and close Redis on shutdown
    const shutdown = async () => {
        app.log.info('shutting down...')
        await app.close()
        await store.close()
        process.exit(0)
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)

    await app.listen({ port: config.PORT, host: '0.0.0.0' })
}

main()
.catch(e => {
    console.error(e)
    process.exit(1)
})