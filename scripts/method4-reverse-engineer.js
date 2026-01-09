/**
 * Method 4: Reverse Engineer Conversation Format
 * Based on: https://gist.github.com/avilum/ae9e694e97a2575a19878a879d72ca07
 * 
 * Strategy:
 * 1. Extract strings from the .pb file
 * 2. Look for CORTEX_STEP patterns
 * 3. Search for USER_INPUT or message patterns
 * 4. Extract readable conversation text
 */

const fs = require('fs');
const path = require('path');

const pbFile = path.join(
  process.env.USERPROFILE,
  '.gemini', 'antigravity', 'conversations',
  '0cf50e01-1efd-402d-b5ab-6f5cb05d568b.pb'
);

const outputFile = path.join(__dirname, 'method4-reverse-engineered.txt');

console.log('📂 Reverse Engineering Conversation Structure');
console.log(`Input: ${pbFile}\n`);

try {
  const buffer = fs.readFileSync(pbFile);
  
  console.log(`📊 File Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
  console.log('⏳ Searching for conversation patterns...\n');
  
 // Search for specific patterns
  const patterns = [
    /CORTEX_STEP_TYPE_USER_INPUT/g,
    /USER_REQUEST/g,
    /user_message/g,
    /prompt/g,
    /Build[\s\S]{0,200}/g,  // "Build" followed by up to 200 chars
    /Create[\s\S]{0,200}/g,
    /portfolio[\s\S]{0,100}/g,
    /Orbit[\s\S]{0,100}/g,
  ];
  
  // Convert buffer to string for pattern matching
  const text = buffer.toString('latin1'); // Use latin1 to preserve binary
  
  const findings = {};
  patterns.forEach((pattern, i) => {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      findings[`Pattern ${i + 1} (${pattern.source.substring(0, 30)}...)`] = matches.slice(0, 10);
    }
  });
  
  console.log('🔍 Pattern Search Results:\n');
  Object.entries(findings).forEach(([pattern, matches]) => {
    console.log(`${pattern}: ${matches.length} matches`);
    matches.forEach((m, i) => console.log(`  [${i+1}] ${m.substring(0, 100)}`));
    console.log('');
  });
  
  // Look for longer coherent English text passages
  const englishRegex = /[A-Z][a-z]{3,}(\s+[a-z]{3,}){5,}/g;
  const englishMatches = text.match(englishRegex);
  
  console.log(`\n📝 Found ${englishMatches ? englishMatches.length : 0} English text passages\n`);
  console.log('=== FIRST 30 ENGLISH PASSAGES ===\n');
  
  if (englishMatches) {
    englishMatches.slice(0, 30).forEach((str, i) => {
      console.log(`[${i + 1}] ${str}\n`);
    });
    
    // Save all findings
    const output = [
      '=== PATTERN MATCHES ===\n',
      JSON.stringify(findings, null, 2),
      '\n\n=== ENGLISH TEXT PASSAGES ===\n',
      englishMatches.join('\n\n')
    ].join('\n');
    
    fs.writeFileSync(outputFile, output);
    console.log(`\n📄 Results saved to: ${outputFile}`);
  } else {
    console.log('❌ No readable English passages found');
  }
  
} catch (err) {
  console.error('❌ Error:', err.message);
}
