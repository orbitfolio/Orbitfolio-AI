/**
 * Fast String Extraction from Binary Protobuf Files
 * Uses Node.js Buffer for efficient processing
 */

const fs = require('fs');
const path = require('path');

const pbFile = path.join(
    process.env.USERPROFILE,
    '.gemini', 'antigravity', 'conversations',
    '0cf50e01-1efd-402d-b5ab-6f5cb05d568b.pb'
);

const outputFile = path.join(__dirname, 'method3-fast-strings.txt');
const promptsFile = path.join(__dirname, 'method3-likely-prompts.txt');

console.log('📂 Fast String Extraction (Node.js)');
console.log(`Input: ${pbFile}`);
console.log(`Output: ${outputFile}\n`);

try {
    const startTime = Date.now();
    const buffer = fs.readFileSync(pbFile);
    const size = buffer.length;

    console.log(`📊 File Size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    console.log('⏳ Extracting strings...\n');

    const strings = [];
    let currentString = '';
    const minLength = 4;

    // Fast buffer iteration
    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];

        // Printable ASCII (32-126)
        if (byte >= 32 && byte <= 126) {
            currentString += String.fromCharCode(byte);
        } else {
            if (currentString.length >= minLength) {
                strings.push(currentString);
            }
            currentString = '';
        }
    }

    // Add final string
    if (currentString.length >= minLength) {
        strings.push(currentString);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Found ${strings.length.toLocaleString()} readable strings in ${elapsed}s\n`);

    // Filter for likely user prompts (keywords + length)
    const keywords = ['Build', 'Create', 'Add', 'Fix', 'Implement', 'portfolio', 'scoring',
        'Orbit', 'AI', 'score', 'Supabase', 'auth', 'dashboard', 'VIX',
        'sentiment', 'macro', 'Groq', 'security', 'RLS', 'Piotroski'];

    const likelyPrompts = strings.filter(s => {
        if (s.length < 20 || s.length > 500) return false;
        return keywords.some(kw => s.includes(kw));
    });

    console.log(`📝 Likely user prompts: ${likelyPrompts.length}\n`);
    console.log('=== FIRST 50 LIKELY PROMPTS ===\n');

    likelyPrompts.slice(0, 50).forEach((str, i) => {
        console.log(`[${i + 1}] ${str}\n`);
    });

    // Save all strings
    fs.writeFileSync(outputFile, strings.join('\n'));
    console.log(`\n📄 All strings saved to: ${outputFile}`);

    // Save likely prompts
    fs.writeFileSync(promptsFile, likelyPrompts.join('\n\n' + '='.repeat(80) + '\n\n'));
    console.log(`📄 Likely prompts saved to: ${promptsFile}`);

    console.log(`\n✨ Extraction complete in ${elapsed}s`);

} catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
}
