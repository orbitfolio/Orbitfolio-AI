/**
 * AI Cache Management Utility
 * 
 * This script clears the LLM response cache in data/cache/.
 * Usage: npm run cache:clear
 * 
 * SAFETY: 
 * - Only affects files in data/cache/
 * - Does NOT affect browser cache, cookies, or user sessions.
 */

import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

async function clearCache() {
    console.log('🔍 Checking AI Cache directory...');

    if (!fs.existsSync(CACHE_DIR)) {
        console.log('✅ Cache directory does not exist. Nothing to clear.');
        return;
    }

    const files = fs.readdirSync(CACHE_DIR).filter(f => f !== '.gitkeep');

    if (files.length === 0) {
        console.log('✅ AI Cache is already empty.');
        return;
    }

    console.log(`⚠️  Found ${files.length} cached AI responses.`);

    // In a real CLI we would ask for confirmation, 
    // but here we follow the instruction to be safe.
    files.forEach(file => {
        const filePath = path.join(CACHE_DIR, file);
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted: ${file}`);
    });

    console.log('\n✨ AI Inference Cache cleared successfully.');
}

clearCache().catch(err => {
    console.error('❌ Error clearing cache:', err);
    process.exit(1);
});
