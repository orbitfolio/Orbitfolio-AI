/**
 * Attempt to decode Antigravity conversation protobuf files
 * This is a basic hex dump to see if we can extract readable text
 */

const fs = require('fs');
const path = require('path');

const conversationFile = path.join(
    process.env.USERPROFILE,
    '.gemini', 'antigravity', 'conversations',
    '0cf50e01-1efd-402d-b5ab-6f5cb05d568b.pb'
);

console.log('📂 Reading conversation file:', conversationFile);

try {
    const buffer = fs.readFileSync(conversationFile);
    const size = buffer.length;

    console.log(`\n📊 File Size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    console.log('\n🔍 Searching for readable text...\n');

    // Extract readable ASCII strings (common in protobuf)
    const strings = [];
    let currentString = '';

    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];

        // Printable ASCII characters
        if (byte >= 32 && byte <= 126) {
            currentString += String.fromCharCode(byte);
        } else {
            if (currentString.length > 10) { // Only keep strings > 10 chars
                strings.push(currentString);
            }
            currentString = '';
        }
    }

    // Look for user prompts (they often contain keywords)
    console.log(`Found ${strings.length} readable strings\n`);
    console.log('=== FIRST 100 STRINGS ===\n');

    strings.slice(0, 100).forEach((str, i) => {
        if (str.length > 15) { // Show strings > 15 chars
            console.log(`[${i + 1}] ${str}\n`);
        }
    });

    // Save ALL strings to file for manual review
    const outputPath = path.join(__dirname, 'extracted-prompts.txt');
    const formattedStrings = strings
        .filter(s => s.length > 15)
        .map((s, i) => `[${i + 1}] ${s}`)
        .join('\n\n' + '='.repeat(80) + '\n\n');

    fs.writeFileSync(outputPath, formattedStrings);
    console.log(`\n✅ Full extraction saved to: ${outputPath}`);

} catch (err) {
    console.error('❌ Error:', err.message);
}
