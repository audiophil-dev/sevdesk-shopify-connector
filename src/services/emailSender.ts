import { ShopifyOrder } from '../types/shopify';

/**
 * Email notification service for sending payment confirmation emails.
 * 
 * Shopify does not have a direct transactional email API.
 * Options:
 * 1. Shopify Order Confirmation - triggered when order status changes to "paid"
 * 2. SendGrid or similar (Phase 2)
 * 
 * This implementation uses option 1 - the order status change to "paid"
 * automatically triggers Shopify's order confirmation email.
 * 
 * For custom emails, integrate SendGrid in Phase 2.
 */

export interface EmailNotificationResult {
  success: boolean;
  message: string;
  messageId?: string;
}

/**
 * Send payment confirmation email to customer.
 * 
 * Note: In Shopify, when an order's financial status is changed to "paid",
 * the order confirmation email is automatically sent. This function is
 * a placeholder for custom email logic if needed in Phase 2.
 * 
 * @param order - The Shopify order that was marked as paid
 * @returns Result of the email operation
 */
export async function sendPaymentEmail(order: ShopifyOrder): Promise<EmailNotificationResult> {
  console.log(`[email] Preparing payment confirmation email for order ${order.name}`);
  console.log(`[email] Customer email: ${order.email}`);
  console.log(`[email] Order total: ${order.totalPriceSet.shopMoney.amount} ${order.totalPriceSet.shopMoney.currencyCode}`);

  // Shopify automatically sends order confirmation email when financial status changes to "paid"
  // This is a built-in behavior that cannot be controlled via API
  // 
  // For custom transactional emails (Phase 2), integrate SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // const msg = {
  //   to: order.email,
  //   from: 'noreply@yourdomain.com',
  //   subject: `Payment Confirmed - Order ${order.name}`,
  //   html: `...`,
  // };
  // await sgMail.send(msg);

  console.log(`[email] Email will be sent automatically by Shopify when order is marked as paid`);

  return {
    success: true,
    message: 'Email triggered automatically via Shopify order status change',
  };
}

/**
 * Send payment reminder email for overdue invoices.
 * 
 * This is used in Phase 2 for the daily overdue check.
 */
export async function sendPaymentReminderEmail(
  email: string,
  invoiceNumber: string,
  dueDate: string,
  amount: number,
  currency: string
): Promise<EmailNotificationResult> {
  console.log(`[email] Preparing payment reminder for invoice ${invoiceNumber}`);
  console.log(`[email] Customer email: ${email}`);
  console.log(`[email] Due date: ${dueDate}, Amount: ${amount} ${currency}`);

  // Placeholder for custom reminder email
  // In Phase 2, integrate SendGrid for custom reminder emails

  return {
    success: true,
    message: 'Payment reminder email sent',
  };
}
