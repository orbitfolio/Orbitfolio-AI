export const PUBLIC_CACHE_HEADERS = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
} as const;

export const PRIVATE_NO_STORE_HEADERS = {
    'Cache-Control': 'private, no-store',
} as const;

export const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store',
} as const;
