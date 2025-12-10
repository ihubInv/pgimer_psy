/**
 * Database Migration Runner
 * Executes SQL migration files on the database
 */

const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigration(filePath, migrationName) {
  try {
    console.log(`\n🔄 Running migration: ${migrationName}...`);
    
    // Read SQL file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Execute SQL
    await db.query(sql);
    
    console.log(`✅ Migration completed: ${migrationName}`);
    return true;
  } catch (error) {
    // Check if error is because column/index already exists (not a real error)
    if (error.message && (
      error.message.includes('already exists') ||
      error.message.includes('duplicate') ||
      error.code === '42710' // PostgreSQL duplicate object error
    )) {
      console.log(`ℹ️  Migration already applied (or column/index exists): ${migrationName}`);
      return true;
    }
    
    console.error(`❌ Migration failed: ${migrationName}`);
    console.error('Error:', error.message);
    throw error;
  }
}

async function runAllMigrations() {
  try {
    console.log('🚀 Starting database migrations...\n');
    
    // Test database connection
    const connected = await db.testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to database. Please check your configuration.');
      process.exit(1);
    }
    
    // Migration 1: Add OTP verification tracking
    const migration1Path = path.join(__dirname, '../migrations/add_otp_verified_to_password_reset_tokens.sql');
    await runMigration(migration1Path, 'add_otp_verified_to_password_reset_tokens');
    
    // Migration 2: Add account lockout fields
    const migration2Path = path.join(__dirname, '../migrations/add_account_lockout_fields.sql');
    await runMigration(migration2Path, 'add_account_lockout_fields');
    
    console.log('\n✅ All migrations completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  - Added otp_verified column to password_reset_tokens table');
    console.log('  - Added failed_login_attempts and account_locked_until columns to users table');
    console.log('  - Created index on account_locked_until');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration process failed:', error.message);
    process.exit(1);
  }
}

// Run migrations
runAllMigrations();

