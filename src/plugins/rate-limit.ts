import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import type { RateLimitStrategy } from "../strategies/strategy.js";
import type { MetricsBus } from "../core/metrics.js";

interface Opts {
    strategy: RateLimitStrategy
    metrics: MetricsBus
    keyFrom?: (req: { ip: string, headers: Record<string, unknown> }) => string
}

// Fastify onRequest hook runs before body parsing
// so a throttled request never pays the cost of parsing its payload
// reject early in the lifecycle before deserialization
const plugin: FastifyPluginAsync<Opts> = async (app, opts) => {

    const keyForm = opts.keyFrom ?? ((r) => r.ip)

    app.addHook('onRequest', async (req, reply) => {

        const key = keyForm(req)
        const r = await opts.strategy.check(key)

        reply.header('X-RateLimit-Limit', r.limit)
        reply.header('X-RateLimit-Remaining', Math.max(0, r.remaining))

        opts.metrics.record(r.allowed) // feeds the live counter

        if (!r.allowed) {
            reply.header('Retry-After', Math.ceil(r.retryAfterMs / 1000))

            return reply
                .code(429)
                .send({ error: 'rate_limited', retryAfterMs: r.retryAfterMs })
        }
    })
}

export default fp(plugin, { name: 'rate-limit' })