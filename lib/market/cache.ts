/**
 * Market-data cache wrapping getCacheManager().
 * Quotes TTL 15 min, analysis TTL 6 hours, keyed by symbol + date bucket.
 * Optional Upstash Redis (shared across 5k users) + JSON files under data/cache/market/.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Redis } from '@upstash/redis';
import { getCacheManager } from '../ai/cache/cache-manager';

export const QUOTE_TTL_SECONDS = 15 * 60;
export const ANALYSIS_TTL_SECONDS = 6 * 60 * 60;
export const STALE_ANALYSIS_TTL_SECONDS = 30 * 24 * 60 * 60;
export const STALE_QUOTE_TTL_SECONDS = 30 * 24 * 60 * 60;

const FILE_DIR = join(process.cwd(), 'data', 'cache', 'market');

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
    if (redisClient !== undefined) return redisClient;
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
        try {
            redisClient = Redis.fromEnv();
            console.log('[market-cache] Upstash Redis enabled');
        } catch (err) {
            redisClient = null;
            console.warn(
                '[market-cache] Redis init failed, using memory + file',
                err instanceof Error ? err.message : 'error'
            );
        }
    } else {
        redisClient = null;
    }
    return redisClient;
}

function fileNameFor(key: string): string {
    return key.replace(/[^a-zA-Z0-9._-]+/g, '_') + '.json';
}

function readFileCache<T>(key: string): { data: T; remaining: number } | null {
    try {
        const fp = join(FILE_DIR, fileNameFor(key));
        if (!existsSync(fp)) return null;
        const parsed = JSON.parse(readFileSync(fp, 'utf8')) as { data: T; expiresAt: number };
        const remaining = Math.floor((parsed.expiresAt - Date.now()) / 1000);
        if (!parsed || remaining <= 0) return null;
        return { data: parsed.data, remaining };
    } catch {
        return null;
    }
}

function writeFileCache<T>(key: string, value: T, ttlSeconds: number): void {
    try {
        mkdirSync(FILE_DIR, { recursive: true });
        const fp = join(FILE_DIR, fileNameFor(key));
        writeFileSync(
            fp,
            JSON.stringify({ data: value, expiresAt: Date.now() + ttlSeconds * 1000 }),
            'utf8'
        );
    } catch {
        /* read-only hosts (e.g. Vercel) — ignore */
    }
}

export function quoteBucket(now = Date.now()): string {
    const d = new Date(now);
    const minutes = d.getUTCMinutes();
    const bucket = Math.floor(minutes / 15) * 15;
    const mm = String(bucket).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const day = d.toISOString().slice(0, 10);
    return `${day}T${hh}:${mm}Z`;
}

export function analysisBucket(now = Date.now()): string {
    return new Date(now).toISOString().slice(0, 10);
}

export function quotesCacheKey(symbols: string[], now = Date.now()): string {
    const sorted = [...symbols].map((s) => s.toUpperCase()).sort().join(',');
    return `quotes:${sorted}:${quoteBucket(now)}`;
}

export function quoteCacheKey(symbol: string, now = Date.now()): string {
    return `quote:${symbol.toUpperCase()}:${quoteBucket(now)}`;
}

export function analysisCacheKey(symbol: string, now = Date.now()): string {
    return `analysis:w353532:${symbol.toUpperCase()}:${analysisBucket(now)}`;
}

export function rationaleCacheKey(symbol: string, score: number, now = Date.now()): string {
    return `rationale:${symbol.toUpperCase()}:${score}:${analysisBucket(now)}`;
}

export { staleAnalysisCacheKey, staleQuoteCacheKey } from './cache-keys';

export async function cacheGet<T>(key: string): Promise<T | null> {
    const mem = await getCacheManager().get<T>(key);
    if (mem !== null && mem !== undefined) return mem;

    const redis = getRedis();
    if (redis) {
        try {
            const val = await redis.get<T>(key);
            if (val !== null && val !== undefined) {
                await getCacheManager().set(key, val, QUOTE_TTL_SECONDS);
                return val;
            }
        } catch (err) {
            console.warn('[market-cache] redis get failed', err instanceof Error ? err.message : 'error');
        }
    }

    const file = readFileCache<T>(key);
    if (file) {
        await getCacheManager().set(key, file.data, file.remaining);
        return file.data;
    }
    return null;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await getCacheManager().set(key, value, ttlSeconds);

    const redis = getRedis();
    if (redis) {
        try {
            await redis.set(key, value, { ex: ttlSeconds });
        } catch (err) {
            console.warn('[market-cache] redis set failed', err instanceof Error ? err.message : 'error');
        }
    }

    writeFileCache(key, value, ttlSeconds);
}
