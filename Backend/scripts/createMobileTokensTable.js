/**
 * Creates the mobile_tokens table used for opaque, long-lived mobile auth tokens.
 * Safe to run multiple times (uses IF NOT EXISTS).
 *
 * Usage:
 *   node Backend/scripts/createMobileTokensTable.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function run() {
  try {
    const sqlPath = path.join(__dirname, '..', 'migrations', 'create_mobile_tokens_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('🔄 Creating mobile_tokens table (if not exists)...');
    await db.query(sql);
    console.log('✅ mobile_tokens table is ready.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create mobile_tokens table:', err.message);
    process.exit(1);
  }
}

run();
