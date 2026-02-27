/**
 * Global Jest Setup
 *
 * Runs before all tests. Sets up test environment, mocks, and configurations.
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });
