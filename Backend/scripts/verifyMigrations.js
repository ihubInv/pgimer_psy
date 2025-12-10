/**
 * Verify Database Migrations
 * Checks if migration columns were added successfully
 */

const db = require('../config/database');

async function verifyMigrations() {
  try {
    console.log('🔍 Verifying database migrations...\n');
    
    // Check password_reset_tokens table
    console.log('Checking password_reset_tokens table...');
    const prtResult = await db.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'password_reset_tokens' 
      AND column_name = 'otp_verified'
    `);
    
    if (prtResult.rows.length > 0) {
      console.log('✅ otp_verified column exists in password_reset_tokens table');
      console.log('   Type:', prtResult.rows[0].data_type);
      console.log('   Default:', prtResult.rows[0].column_default);
    } else {
      console.log('❌ otp_verified column NOT found');
    }
    
    // Check users table
    console.log('\nChecking users table...');
    const usersResult = await db.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' 
      AND column_name IN ('failed_login_attempts', 'account_locked_until')
      ORDER BY column_name
    `);
    
    if (usersResult.rows.length === 2) {
      console.log('✅ Both account lockout columns exist in users table:');
      usersResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'NULL'})`);
      });
    } else {
      console.log('❌ Some account lockout columns are missing');
      console.log('   Found:', usersResult.rows.map(r => r.column_name).join(', '));
    }
    
    // Check index
    console.log('\nChecking index...');
    const indexResult = await db.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users' 
      AND indexname = 'idx_users_account_locked_until'
    `);
    
    if (indexResult.rows.length > 0) {
      console.log('✅ Index idx_users_account_locked_until exists');
    } else {
      console.log('⚠️  Index idx_users_account_locked_until not found (may not be critical)');
    }
    
    console.log('\n✅ Migration verification complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyMigrations();

