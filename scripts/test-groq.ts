import { GroqClient } from '../lib/ai/core/groq-client';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local manually
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                // Remove quotes
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        });
    }
} catch (e) {
    console.error('Error loading .env.local:', e);
}

async function run() {
    const client = new GroqClient();
    try {
        console.log('Testing GroqClient complete()...');
        const response = await client.complete([{ role: 'user', content: 'Generate a fictional stock profile for "OrbitAI" with fields: symbol, price, sector.' }]);
        console.log('Success!');
        console.log(JSON.stringify(response, null, 2));
    } catch (e) {
        console.error('Failed!', e);
    }
}
run();
