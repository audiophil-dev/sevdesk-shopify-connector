/**
 * Jest Global Setup
 *
 * Runs once before all tests. Sets up the test database and verifies connectivity.
 */

import { setupTestDatabase, getTestPool } from './database';

export default async function globalSetup(): Promise<void> {
  console.log('\n[Global Setup] Starting test environment setup...');

  try {
    // Verify database connectivity
    const pool = getTestPool();
    const result = await pool.query('SELECT NOW()');
    console.log('[Global Setup] Database connection established at:', result.rows[0].now);

    // Setup database schema
    await setupTestDatabase();

    console.log('[Global Setup] Test environment ready\n');
  } catch (error) {
    console.error('[Global Setup] Failed to setup test environment:', error);
    throw error;
  }
}
