import { EventEmitter } from 'node:events'

export interface Snapshot {
    allowed: number
    throttled: number
    total: number
}

export class MetricsBus extends EventEmitter {
    private allowed = 0
    private throttled = 0

    record(wasAllowed: boolean): void {
        wasAllowed ? this.allowed++ : this.throttled++
    }

    snapshot(): Snapshot {
        return {
            allowed: this.allowed,
            throttled: this.throttled,
            total: this.allowed + this.throttled
        }
    }

    startBroadcast(everyMs = 500): NodeJS.Timeout {
        const timeout= setInterval(() =>
            this.emit('snapshot', this.snapshot(), everyMs))

        //timer won't block a graceful shutdown
        timeout.unref() // dont keep the process alive just for metrics

        return timeout
    }
}