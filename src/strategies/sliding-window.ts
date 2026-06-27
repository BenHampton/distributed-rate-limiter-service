import type { Store } from "../store/store.js";
import type { RateLimitStrategy } from "./strategy.js";
import type { RateLimitResult, RateKey } from "../core/types.js";
import { SLIDING_WINDOW_LUA } from "./lua.js";

export class SlidingWindowStrategy implements RateLimitStrategy {
    readonly name = "sliding-window" as const;

    constructor(
        private store: Store,
        private limit: number,
        private windowMs: number,
    ) {
        store.defineScript("slidingWindow", SLIDING_WINDOW_LUA);
    }

    async check(key: RateKey): Promise<RateLimitResult> {
        const now = Date.now();
        const [allowed, remaining, resetMs] = await this.store.runScript(
            "slidingWindow", [`rl:sw:${key}`],
            [this.limit, this.windowMs, now],
        );
        return {
            allowed: allowed === 1,
            remaining: Math.max(0, remaining),
            limit: this.limit,
            resetMs,
            retryAfterMs: allowed === 1 ? 0 : resetMs,
        };
    }
}