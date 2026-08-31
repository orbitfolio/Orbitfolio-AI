import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a new ratelimiter only if credentials are provided
export const ratelimit =
    typeof process !== 'undefined' &&
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
        ? new Ratelimit({
              redis: Redis.fromEnv(),
              limiter: Ratelimit.slidingWindow(100, "1 h"),
              analytics: true,
              prefix: "@upstash/ratelimit",
          })
        : null;
