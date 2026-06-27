import type { Store } from "../store/store.js";
import type { Config } from "../core/config.js";
import type { RateLimitStrategy } from "./strategy.js";
import { TokenBucketStrategy } from "./token-bucket.js";
import { SlidingWindowStrategy } from "./sliding-window.js";

export function makeStrategy(config: Config, store: Store): RateLimitStrategy {
    if (config.RATE_ALGO === 'token-bucket') {

        return new TokenBucketStrategy(store, config.RATE_LIMIT, config.RATE_WINDOW_MS);
    } else if (config.RATE_ALGO === 'sliding-window') {

        return new SlidingWindowStrategy(store, config.RATE_LIMIT, config.RATE_WINDOW_MS);
    }

    throw new Error('Can not determine strategy')
}