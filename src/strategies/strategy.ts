import type { RateLimitResult, RateKey } from "../core/types";

export interface RateLimitStrategy {
    readonly name: string
    check(key: RateKey): Promise<RateLimitResult>
}