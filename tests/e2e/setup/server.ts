/**
 * Test Server Setup
 *
 * Provides utilities for starting and stopping a test Express server
 * for E2E tests. Server runs on a random available port to avoid conflicts.
 */

import { Express } from 'express';
import { Server } from 'http';

let testServer: Server | null = null;
let testApp: Express | null = null;

/**
 * Start test server on a random available port
 *
 * Creates a new Express app instance for E2E testing.
 * Finds an available port and starts the application on it.
 * Returns app instance, port number, and base URL for making requests.
 *
 * @returns {Promise<{app: Express; port: number; url: string}>} Test server details
 * @throws {Error} If server fails to start
 */
export async function startTestServer(): Promise<{
  app: Express;
  port: number;
  url: string;
}> {
  console.log('Starting test server...');

  // Dynamically import Express to avoid requiring at module level
  const expressModule = await import('express');
  const express = expressModule.default as unknown as Express;

  // Create a fresh Express app for E2E tests
  const app = express();

  // Add basic middleware
  app.use((req, res, next) => {
    console.log(`[E2E Server] ${req.method} ${req.url}`);
    next();
  });

  // Find an available port (try ports starting from 3000)
  const net = await import('net');
  const port = await findAvailablePort(net.createServer());

  return new Promise<{app: Express; port: number; url: string}>((resolve, reject) => {
    testServer = app.listen(port, () => {
      const url = `http://localhost:${port}`;
      testApp = app;
      console.log(`Test server started on port ${port}`);
      console.log(`Test server URL: ${url}`);
      resolve({
        app,
        port,
        url,
      });
    });

    testServer.on('error', (err: any) => {
      console.error('Test server failed to start:', err);
      reject(err);
    });
  });
}

/**
 * Stop test server
 *
 * Closes the test server connection and cleans up resources.
 * Should be called in afterAll or afterEach to release the port.
 *
 * @returns {Promise<void>}
 */
export async function stopTestServer(): Promise<void> {
  console.log('Stopping test server...');

  if (!testServer) {
    console.log('No test server running, nothing to stop');
    return;
  }

  return new Promise<void>((resolve, reject) => {
    testServer.close((err) => {
      if (err) {
        console.error('Error stopping test server:', err);
        reject(err);
        return;
      }

      console.log('Test server stopped');
      testServer = null;
      testApp = null;
      resolve();
    });
  });
}

/**
 * Find an available port to bind to
 *
 * Tries to bind to ports starting from a base port (3000).
 * Returns the first available port found.
 *
 * @param {any} server - Net server instance to test binding
 * @returns {Promise<number>} Available port number
 */
function findAvailablePort(server: any): Promise<number> {
  const basePort = 3000;
  const maxPort = basePort + 100; // Try up to 100 ports

  return new Promise<number>((resolve, reject) => {
    let port = basePort;

    const tryPort = () => {
      if (port > maxPort) {
        reject(new Error(`No available ports found between ${basePort} and ${maxPort}`));
        return;
      }

      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} is in use, trying next...`);
          port++;
          server.removeAllListeners('error');
          tryPort();
        } else {
          reject(err);
        }
      });

      server.listen(port, () => {
        server.removeAllListeners('error');
        server.close(() => {
          console.log(`Found available port: ${port}`);
          resolve(port);
        });
      });
    };

    tryPort();
  });
}

/**
 * Get current test server app instance
 *
 * Returns the Express app instance if server is running, null otherwise.
 *
 * @returns {Express | null} Test app or null
 */
export function getTestApp(): Express | null {
  return testApp;
}

/**
 * Check if test server is running
 *
 * Returns true if test server is currently running.
 *
 * @returns {boolean} Server running status
 */
export function isTestServerRunning(): boolean {
  return testServer !== null && testApp !== null;
}
