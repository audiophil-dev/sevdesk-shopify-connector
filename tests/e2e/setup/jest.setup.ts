/**
 * Jest Setup (Per-Test Setup)
 *
 * Runs before each test file.
 * Can be used for per-test setup, timeout configuration, etc.
 */

// Per-test setup
beforeAll(async () => {
  // Optional: Setup before each test file
  console.log('=== Before All Tests (per-file) ===');
});

afterAll(async () => {
  // Optional: Cleanup after each test file
  // Note: Global teardown handles database cleanup
  console.log('=== After All Tests (per-file) ===');
});

// Optional: Extend Jest timeout for longer-running tests
// Jest default is 5000ms, can be extended here if needed
// jest.setTimeout(10000); // 10 seconds

// E2E-specific timeout extension
// E2E tests may take longer due to server startup and network operations
jest.setTimeout(30000); // 30 seconds for E2E tests
