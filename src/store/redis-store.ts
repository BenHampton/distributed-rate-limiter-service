import Redis from 'ioredis'
import type { Store } from './store.js'

export class RedisStore implements Store {
    private redis: Redis

    constructor(url: string) {
        this.redis = new Redis(url, { enableReadyCheck: true });
    }

    defineScript(name: string, lua: string) {
        // ioredis registers it as redis.<name>() and handles EVALSHA caching
        this.redis.defineCommand(name, { numberOfKeys: 1, lua })
    }

    async runScript(name: string, keys: string[], args: (string | number)[]): Promise<[number, number, number]> {
        // @ts-expect-error dynamic command added by defineCommand
        const res = await this.redis[name](...keys, ...args);
        const out = (res as unknown[]).map(Number)
        const [allowed, remaining, reset] = out

        if (allowed === undefined || remaining === undefined || reset === undefined) {
            throw new Error(`script ${name} returned ${out.length} values, expected 3`);
        }

        return [allowed, remaining, reset];
    }

    close() {
        return this.redis.quit()
            .then(() => void 0)
    }
}