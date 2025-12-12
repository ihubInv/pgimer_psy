/**
 * Migration script to create password_change_otps table
 * Run with: node scripts/createPasswordChangeOTPTable.js
 */

const db = require('../config/database');

async function createPasswordChangeOTPTable() {
  try {
    console.log('Creating password_change_otps table...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_change_otps (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        otp VARCHAR(6) NOT NULL,
        verification_token VARCHAR(255),
        expires_at TIMESTAMP NOT NULL,
        otp_verified BOOLEAN DEFAULT false,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index for faster lookups
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_password_change_otps_user_id ON password_change_otps(user_id);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_password_change_otps_token ON password_change_otps(verification_token);
    `);

    console.log('✅ password_change_otps table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating password_change_otps table:', error);
    process.exit(1);
  }
}

createPasswordChangeOTPTable();

