import type { FastifyInstance } from "fastify";
import type { MetricsBus } from "../core/metrics.js";

export function registerCounter(app: FastifyInstance, metrics: MetricsBus) {

    const clients = new Set<WebSocket>()

    app.get('/ws/metrics', { websocket: true }, (socket) => {
        clients.add(socket)
        socket.send(JSON.stringify(metrics.snapshot()))
        socket.on('close', () => clients.delete(socket))
    })

    metrics.on('snapshot', (snap) => {
        const message = JSON.stringify(snap)
        for (const client of clients) {
            if (client.readyState === client.OPEN) {
                client.send(message)
            }
        }
    })

    metrics.startBroadcast(500)
}