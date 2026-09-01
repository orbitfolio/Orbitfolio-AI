import { NextResponse } from 'next/server';
import { GroqClient } from '@/lib/ai/core/groq-client';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/http/cache-headers';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { success: false, message: 'Not found' },
            { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
        );
    }

    console.log('🧪 API Test: JSON Mode');

    if (!process.env.GROQ_API_KEY) {
        return NextResponse.json(
            { success: false, error: 'Missing GROQ_API_KEY in server env' },
            { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
        );
    }

    const client = new GroqClient();
    try {
        const response = await client.complete([{ role: 'user', content: 'Generate a fictional stock profile for "OrbitAI" with fields: symbol, price, sector. Output JSON.' }]);

        let parsed;
        try {
            parsed = JSON.parse(response.content);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Response is not JSON', raw: response.content },
                { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
            );
        }

        return NextResponse.json(
            { success: true, data: parsed, finishReason: response.finishReason },
            { headers: PRIVATE_NO_STORE_HEADERS }
        );
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Request failed';
        return NextResponse.json(
            { success: false, error: message },
            { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
        );
    }
}
