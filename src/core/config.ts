import { z } from 'zod'
import 'dotenv/config';

const Schema = z.object({
    PORT: z.coerce.number().default(3000),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    RATE_ALGO: z.enum(['token-bucket', 'sliding-window'])
        .default('token-bucket'),
    RATE_LIMIT: z.coerce.number().default(10), // request
    RATE_WINDOW_MS: z.coerce.number().default(1000) // per window
})

export type Config = z.infer<typeof Schema>

export function loadConfig(): Config {
    const parsed = Schema.safeParse(process.env)

    console.log("[config]", parsed.data);

    if (!parsed.success) {
        console.error("✗ Invalid configuration:", parsed.error.message);
        process.exit(1);
    }

    return parsed.data
}