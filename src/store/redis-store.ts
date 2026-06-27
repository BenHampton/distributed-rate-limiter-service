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

    async runScript(name: string, keys: string[], args: (string | number)[]): Promise<number[]> {
        // @ts-expect-error dynamic command added by defineCommand
        const res = await this.redis[name](...keys, ...args);
        return (res as number[]).map(Number)
    }

    close() {
        return this.redis.quit()
            .then(() => void 0)
    }
}