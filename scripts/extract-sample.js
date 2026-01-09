const fs = require('fs');
const path = require('path');

const conversationFile = path.join(
  process.env.USERPROFILE,
  '.gemini', 'antigravity', 'conversations',
  '0cf50e01-1efd-402d-b5ab-6f5cb05d568b.pb'
);

const outputFile = path.join(__dirname, 'conversation-sample.pb');

console.log('📂 Reading conversation file:', conversationFile);

try {
  const buffer = fs.readFileSync(conversationFile);
  
  // Extract first 50KB as a sample (manageable for online decoder)
  const sampleSize = 50 * 1024; // 50KB
  const sample = buffer.slice(0, sampleSize);
  
  // Save binary sample
  fs.writeFileSync(outputFile, sample);
  console.log(`✅ Sample saved: ${outputFile} (${sampleSize} bytes)`);
  
  // Also save as hex for online decoder
  const hexFile = path.join(__dirname, 'conversation-sample.hex');
  fs.writeFileSync(hexFile, sample.toString('hex'));
  console.log(`✅ Hex version saved: ${hexFile}`);
  
  console.log('\n📋 Next steps:');
  console.log('1. Visit: https://pbdecoder.online/ or https://protobufpal.com/');
  console.log(`2. Upload the file: ${outputFile}`);
  console.log('   OR paste hex from: conversation-sample.hex');
  console.log('3. The decoder will show the structure without needing .proto files!');
  
} catch (err) {
  console.error('❌ Error:', err.message);
}
