/**
 * Unit tests for email sender service
 */

import { sendPaymentEmail, sendPaymentReminderEmail } from '../services/emailSender';
import { shopifyOrders } from '../test/fixtures';

// Mock console to suppress logs during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('EmailSender', () => {
  describe('sendPaymentEmail', () => {
    it('should return success for valid order', async () => {
      const result = await sendPaymentEmail(shopifyOrders.pending);

      expect(result.success).toBe(true);
      expect(result.message).toContain('automatically via Shopify');
    });

    it('should log order details', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      await sendPaymentEmail(shopifyOrders.paid);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[email]')
      );
    });
  });

  describe('sendPaymentReminderEmail', () => {
    it('should return success for valid reminder', async () => {
      const result = await sendPaymentReminderEmail(
        'test@example.com',
        '2026-00001',
        '2026-03-15',
        99.99,
        'EUR'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Payment reminder');
    });

    it('should log reminder details', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      await sendPaymentReminderEmail(
        'test@example.com',
        '2026-00001',
        '2026-03-15',
        99.99,
        'EUR'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[email]')
      );
    });
  });
});
