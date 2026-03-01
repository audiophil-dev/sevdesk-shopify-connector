/**
 * Test Database Utilities
 *
 * Provides functions for managing a dedicated test database pool,
 * setting up tables, seeding data, and cleaning up between tests.
 */

import { Pool, PoolClient } from 'pg';

let testPool: Pool | null = null;

/**
 * Get dedicated test database pool
 *
 * Creates a new pool connection using TEST_DATABASE_URL from environment.
 * Falls back to individual TEST_DB_* environment variables if TEST_DATABASE_URL is not set.
 *
 * @returns {Pool} PostgreSQL pool connected to test database
 * @throws {Error} If database URL is not configured
 */
export function getTestPool(): Pool {
  if (!testPool) {
    // Try TEST_DATABASE_URL first (preferred)
    let databaseUrl = process.env.TEST_DATABASE_URL;

    // Fallback to individual environment variables
    if (!databaseUrl) {
      const dbHost = process.env.TEST_DB_HOST || 'postgres-test';
      const dbPort = process.env.TEST_DB_PORT || '5432';
      const dbUser = process.env.TEST_DB_USER || 'testuser';
      const dbPassword = process.env.TEST_DB_PASSWORD || 'testpass';
      const dbName = process.env.TEST_DB_NAME || 'sevdesk_shopify_test';

      databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
    }

    if (!databaseUrl) {
      throw new Error('TEST_DATABASE_URL or TEST_DB_* environment variables not configured');
    }

    testPool = new Pool({
      connectionString: databaseUrl,
      max: 5, // Lower max connections for tests
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

    // Handle pool errors
    testPool.on('error', (err) => {
      console.error('Test database pool error:', err);
    });
  }

  return testPool;
}

/**
 * Create tables and seed initial data from fixtures
 *
 * Sets up the test database schema and inserts initial test data.
 * Creates schema_migrations tracking table and all application tables.
 *
 * @throws {Error} If table creation or data seeding fails
 */
export async function setupTestDatabase(): Promise<void> {
  const pool = getTestPool();

  console.log('Setting up test database...');

  // Create schema_migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Create application tables
  // Note: This should match what migrations create. Based on project structure,
  // we need to create tables for syncing Sevdesk invoices to Shopify orders.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sevdesk_invoices (
      id VARCHAR(255) PRIMARY KEY,
      invoice_number VARCHAR(255),
      status VARCHAR(50),
      total DECIMAL(10,2),
      currency VARCHAR(10),
      invoice_date DATE,
      due_date DATE,
      header TEXT,
      update_time TIMESTAMP,
      contact_id VARCHAR(255)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shopify_orders (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255),
      display_financial_status VARCHAR(50),
      total_price DECIMAL(10,2),
      currency_code VARCHAR(10),
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sync_mapping (
      sevdesk_invoice_id VARCHAR(255) PRIMARY KEY,
      shopify_order_id VARCHAR(255) UNIQUE,
      synced_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (sevdesk_invoice_id) REFERENCES sevdesk_invoices(id)
    )
  `);

  // Create notification_history table for processor idempotency checks
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_history (
      id SERIAL PRIMARY KEY,
      sevdesk_invoice_id VARCHAR(255) NOT NULL,
      notification_type VARCHAR(50) NOT NULL,
      customer_email VARCHAR(255),
      shopify_order_id VARCHAR(255),
      sent_at TIMESTAMP DEFAULT NOW(),
      status VARCHAR(50) NOT NULL,
      error_message TEXT
    )
  `);

  console.log('Test database tables created');
}

/**
 * Truncate tables, clean up test data
 *
 * Removes all data from tables while preserving table structure.
 * Resets database to a clean state between test runs.
 *
 * @throws {Error} If truncation fails
 */
export async function teardownTestDatabase(): Promise<void> {
  const pool = getTestPool();

  console.log('Cleaning up test database...');

  // Truncate all tables (order matters for foreign key constraints)
  // Disable triggers temporarily for faster truncation
  await pool.query('SET session_replication_role = replica');

  await pool.query('TRUNCATE TABLE sync_mapping CASCADE');
  await pool.query('TRUNCATE TABLE sevdesk_invoices CASCADE');
  await pool.query('TRUNCATE TABLE shopify_orders CASCADE');
  await pool.query('TRUNCATE TABLE notification_history CASCADE');

  // Re-enable triggers
  await pool.query('SET session_replication_role = DEFAULT');

  console.log('Test database cleaned');
}

/**
 * Reset to known state between tests
 *
 * Truncates all tables and re-seeds with initial test data.
 * This is useful for tests that need a consistent starting state.
 *
 * @throws {Error} If reset fails
 */
export async function resetTestData(): Promise<void> {
  await teardownTestDatabase();
  // Optionally re-seed with specific test data if needed
  // Currently just provides a clean slate
}

/**
 * Close pool (for teardown)
 *
 * Closes all connections and shuts down the test database pool.
 * Should be called after all tests complete.
 *
 * @throws {Error} If pool closing fails
 */
export async function closeTestPool(): Promise<void> {
  if (testPool) {
    console.log('Closing test database pool...');
    await testPool.end();
    testPool = null;
  }
}

/**
 * Get a client for direct database operations
 *
 * Useful for tests that need a single connection with transactions.
 *
 * @returns {Promise<PoolClient>} A database client
 */
export async function getTestClient(): Promise<PoolClient> {
  const pool = getTestPool();
  return pool.connect();
}
