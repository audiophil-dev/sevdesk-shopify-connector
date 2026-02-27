/**
 * Global Jest Teardown
 *
 * Runs after all tests complete. Cleans up resources and connections.
 */

import { closeTestPool } from './database';

export default async function globalTeardown(): Promise<void> {
  console.log('\n[Global Teardown] Starting cleanup...');

  try {
    await closeTestPool();
    console.log('[Global Teardown] Test database pool closed');
  } catch (error) {
    console.error('[Global Teardown] Error during cleanup:', error);
  }

  console.log('[Global Teardown] Cleanup complete\n');
}
