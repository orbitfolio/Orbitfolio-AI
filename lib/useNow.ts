'use client';

import { useEffect, useState } from 'react';

/**
 * Ticking clock for "as of N min ago" labels. Returns null until mounted,
 * so render stays pure (no Date.now() during render) and SSR-safe.
 */
export function useNow(intervalMs = 60_000): number | null {
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        // Deferred one tick so the first setState isn't synchronous
        // within the effect (react-compiler rule).
        const kickoff = setTimeout(() => {
            setNow(Date.now());
            interval = setInterval(() => setNow(Date.now()), intervalMs);
        }, 0);
        return () => {
            clearTimeout(kickoff);
            if (interval) clearInterval(interval);
        };
    }, [intervalMs]);
    return now;
}
