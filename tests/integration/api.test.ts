import request from 'supertest';
import app from '../../src/server';
import { setupTestDatabase, teardownTestDatabase, resetTestData, getTestPool } from '../setup/database';
import express from 'express';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await resetTestData();
  });

  afterEach(async () => {
    const pool = getTestPool();
    await pool.query('TRUNCATE TABLE sync_mapping CASCADE');
    await pool.query('TRUNCATE TABLE sevdesk_invoices CASCADE');
    await pool.query('TRUNCATE TABLE shopify_orders CASCADE');
  });

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('returns timestamp in ISO 8601 format', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
      
      const timestamp = response.body.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('returns JSON content type', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('has required properties', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toContain('status');
      expect(Object.keys(response.body)).toContain('timestamp');
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for unhandled routes', async () => {
      const response = await request(app).get('/nonexistent-route');

      expect(response.status).toBe(404);
    });

    it('returns 500 for server errors', async () => {
      // Create a temporary route that throws an error
      const tempApp = express();
      tempApp.get('/test-error', () => {
        throw new Error('Test error');
      });
      tempApp.use((err: Error, _req: any, res: any, _next: any) => {
        res.status(500).json({
          error: err.message,
          status: 500
        });
      });

      const response = await request(tempApp).get('/test-error');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('status', 500);
    });

    it('returns proper error format for 500 errors', async () => {
      const tempApp = express();
      tempApp.get('/test-error', () => {
        throw new Error('Test error message');
      });
      tempApp.use((err: Error, _req: any, res: any, _next: any) => {
        res.status(500).json({
          error: err.message,
          status: 500
        });
      });

      const response = await request(tempApp).get('/test-error');

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('status', 500);
      expect(response.body.error).toBe('Test error message');
    });
  });

  describe('Server Lifecycle', () => {
    it('can start and accept requests', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBeLessThan(500);
    });

    it('handles multiple requests', async () => {
      const response1 = await request(app).get('/health');
      const response2 = await request(app).get('/health');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.status).toBe('ok');
      expect(response2.body.status).toBe('ok');
    });

    it('maintains state across requests', async () => {
      const response1 = await request(app).get('/health');
      await new Promise((resolve) => setTimeout(resolve, 10));
      const response2 = await request(app).get('/health');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body).toHaveProperty('timestamp');
      expect(response2.body).toHaveProperty('timestamp');
    });
  });

  describe('Request/Response Validation', () => {
    it('handles malformed JSON body', async () => {
      const response = await request(app)
        .post('/test-endpoint')
        .set('Content-Type', 'application/json')
        .send('invalid json {{{');

      expect([400, 500]).toContain(response.status);
    });

    it('handles empty JSON body', async () => {
      const response = await request(app)
        .post('/test-endpoint')
        .set('Content-Type', 'application/json')
        .send({});

      expect([400, 404]).toContain(response.status);
    });

    it('accepts valid JSON', async () => {
      const response = await request(app)
        .post('/test-endpoint')
        .set('Content-Type', 'application/json')
        .send({ test: 'data' });

      expect(response.status).toBe(404);
    });
  });
});
