import { NextResponse } from 'next/server';
import { GroqClient } from '@/lib/ai/core/groq-client';

export async function GET() {
    console.log('🧪 API Test: JSON Mode');

    if (!process.env.GROQ_API_KEY) {
        return NextResponse.json({ success: false, error: 'Missing GROQ_API_KEY in server env' }, { status: 500 });
    }

    const client = new GroqClient();
    try {
        const response = await client.complete([{ role: 'user', content: 'Generate a fictional stock profile for "OrbitAI" with fields: symbol, price, sector.' }]);

        // Simply parse and return
        let parsed;
        try {
            parsed = JSON.parse(response.content);
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Response is not JSON', raw: response.content }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: parsed, finishReason: response.finishReason });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
