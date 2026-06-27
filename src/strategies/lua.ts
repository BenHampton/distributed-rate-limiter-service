export const TOKEN_BUCKET_LUA = `
-- KEYS[1] = bucket key
-- ARGV[1] = capacity   ARGV[2] = refillPerMs
-- ARGV[3] = nowMs      ARGV[4] = cost
local cap   = tonumber(ARGV[1])
local rate  = tonumber(ARGV[2])
local now   = tonumber(ARGV[3])
local cost  = tonumber(ARGV[4])

local state = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(state[1])
local ts     = tonumber(state[2])

if tokens == nil then tokens = cap; ts = now end

-- refill based on elapsed time
local elapsed = math.max(0, now - ts)
tokens = math.min(cap, tokens + elapsed * rate)

local allowed = 0
if tokens >= cost then
tokens = tokens - cost
allowed = 1
end

redis.call('HMSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(cap / rate))

local resetMs = math.ceil((cap - tokens) / rate)
return { allowed, math.floor(tokens), resetMs }
`

export const SLIDING_WINDOW_LUA = `
-- KEYS[1] = base key
-- ARGV[1] = limit  ARGV[2] = windowMs  ARGV[3] = nowMs
local limit  = tonumber(ARGV[1])
local win    = tonumber(ARGV[2])
local now    = tonumber(ARGV[3])

local curWin  = math.floor(now / win)
local prevWin = curWin - 1
local elapsed = (now % win) / win  -- 0..1 into current window

local curKey  = KEYS[1] .. ':' .. curWin
local prevKey = KEYS[1] .. ':' .. prevWin

local cur  = tonumber(redis.call('GET', curKey))  or 0
local prev = tonumber(redis.call('GET', prevKey)) or 0

local weighted = prev * (1 - elapsed) + cur

if weighted + 1 > limit then
  return { 0, limit - math.floor(weighted), win - (now % win) }
end

redis.call('INCR', curKey)
redis.call('PEXPIRE', curKey, win * 2)
return { 1, limit - math.floor(weighted) - 1, win - (now % win) }
`