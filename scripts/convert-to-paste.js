/**
 * Convert protobuf binary to hex and base64 for pasting into protobufpal.com
 */

const fs = require('fs');
const path = require('path');

const sampleFile = path.join(__dirname, 'conversation-sample.pb');
const hexFile = path.join(__dirname, 'conversation-sample.hex');
const base64File = path.join(__dirname, 'conversation-sample.base64');

console.log('📂 Converting protobuf to paste-friendly formats\n');

try {
    const buffer = fs.readFileSync(sampleFile);

    // Convert to hex
    const hex = buffer.toString('hex');
    fs.writeFileSync(hexFile, hex);
    console.log(`✅ Hex format saved: ${hexFile}`);
    console.log(`   Length: ${hex.length} characters\n`);

    // Convert to base64
    const base64 = buffer.toString('base64');
    fs.writeFileSync(base64File, base64);
    console.log(`✅ Base64 format saved: ${base64File}`);
    console.log(`   Length: ${base64.length} characters\n`);

    // Show preview
    console.log('📋 Preview (first 200 chars):\n');
    console.log('HEX:');
    console.log(hex.substring(0, 200));
    console.log('\nBASE64:');
    console.log(base64.substring(0, 200));

    console.log('\n\n📝 Instructions for protobufpal.com:');
    console.log('1. Open: https://protobufpal.com/');
    console.log('2. Choose "Decode" tab');
    console.log('3. Select format: "Base64" or "Hex"');
    console.log('4. Copy the ENTIRE contents of conversation-sample.base64 or .hex');
    console.log('5. Paste into the input box');
    console.log('6. Click "Decode"');

} catch (err) {
    console.error('❌ Error:', err.message);
}
