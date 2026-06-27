export interface RateLimitResult {
    allowed: boolean
    remaining: number // tokens/slots left
    list: number
    resetMs: number // ms until window/refill resets
    retryAfterMs: number// 0 when allowed
}

//Identifies who is being limited (IP, API key, user id).
export type RateKey = string