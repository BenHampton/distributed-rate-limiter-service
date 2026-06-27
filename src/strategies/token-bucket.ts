import type { Store } from '../store/store.js'
import type { RateLimitStrategy } from "./strategy.js";
import type { RateLimitResult, RateKey } from "../core/types.js";
import { TOKEN_BUCKET_LUA } from "./lua.js";

export class TokenBucketStrategy implements RateLimitStrategy {
    readonly name = 'token-bucket' as const
    private readonly refillPerMs: number

    constructor(
        private store: Store,
        private capacity: number,
        windowsMs: number
    ) {
        this.refillPerMs = capacity / windowsMs
        store.defineScript('tokenBucket', TOKEN_BUCKET_LUA)
    }

    async check(key: RateKey): Promise<RateLimitResult> {
        const now = Date.now()
        const [allowed, remaining, resetMs] = await this.store.runScript(
            'tokenBucket', [`rl:tb:${key}`],
            [this.capacity, this.refillPerMs, now, 1]
        )

        return {
            allowed: allowed === 1,
            remaining,
            limit: this.capacity,
            resetMs,
            retryAfterMs: allowed === 1 ? 0 : Math.ceil(1 / this.refillPerMs),
        }
    }
}