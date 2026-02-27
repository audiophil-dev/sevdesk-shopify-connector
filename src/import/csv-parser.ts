import * as fs from 'fs';
import * as readline from 'readline';

import { ParsedOrder, ParsedLineItem } from './types';

/**
 * Parse orders CSV file and group rows by order ID.
 * Each order can have multiple line items (multiple CSV rows with same Id).
 */
export async function parseOrdersCsv(filePath: string): Promise<ParsedOrder[]> {
  return new Promise((resolve, reject) => {
    const orderMap = new Map<string, ParsedOrder>();
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    rl.on('line', (line: string) => {
      if (!line.trim()) {
        return; // Skip empty lines
      }

      // Handle UTF-8 BOM (Byte Order Mark)
      const cleanLine = line.replace(/^\uFEFF/, '').trim();
      
      // Parse CSV line (simple comma-separated)
      // Assumes quoted fields are properly escaped in the CSV
      const fields = parseCsvLine(cleanLine);

      if (fields.length < 2) {
        console.warn(`Skipping malformed line: ${line}`);
        return;
      }

      // First field is Order ID, second is Email
      const orderId = fields[0]?.trim() || '';
      const email = fields[1]?.trim() || '';

      if (!orderId) {
        console.warn(`Skipping line without order ID: ${line}`);
        return;
      }

      // Create or update order in map
      if (!orderMap.has(orderId)) {
        // New order
        const order: ParsedOrder = {
          id: orderId,
          email,
          lineItems: [],
          raw: { Id: orderId, Email: email },
        };
        orderMap.set(orderId, order);
      }

      const order = orderMap.get(orderId)!;

      // Create line item from row data
      // Fields beyond first two are raw data
      const lineItem: ParsedLineItem = {
        name: fields[2]?.trim() || '',
        quantity: parseInt(fields[3]?.trim() || '1', 10),
        price: fields[4]?.trim() || '0',
        sku: fields[5]?.trim() || '',
      };

      // Add raw fields for reference
      for (let i = 2; i < fields.length; i++) {
        const header = getHeaderName(i);
        if (header) {
          order.raw[header] = fields[i]?.trim() || '';
        }
      }

      // Check if this line item already exists (avoid duplicates)
      const existingItem = order.lineItems.find(item => item.sku === lineItem.sku);
      if (!existingItem) {
        order.lineItems.push(lineItem);
      }
    });

    rl.on('close', () => {
      const orders = Array.from(orderMap.values());
      console.log(`[csv-parser] Parsed ${orders.length} unique orders with ${orders.reduce((sum, o) => sum + o.lineItems.length, 0)} total line items`);
      resolve(orders);
    });

    rl.on('error', (error: Error) => {
      reject(error);
    });
  });
}

/**
 * Simple CSV line parser.
 * Handles quoted fields with commas inside.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      currentField += char;
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }

  fields.push(currentField);
  return fields.map(field => field.trim());
}

/**
 * Get header name for index (used for raw data storage).
 * This can be customized based on actual CSV structure.
 */
function getHeaderName(index: number): string | null {
  // Common Shopify order export headers
  const headers = [
    'Id', 'Email', 'Name', 'Quantity', 'Price', 'SKU',
    'Financial Status', 'Fulfillment Status', 'Created At',
    'Shipping First Name', 'Shipping Last Name', 'Shipping Address1',
    'Shipping Address2', 'Shipping City', 'Shipping Province',
    'Shipping Country', 'Shipping Zip', 'Billing First Name',
    'Billing Last Name', 'Billing Address1', 'Billing Address2',
    'Billing City', 'Billing Province', 'Billing Country',
    'Billing Zip', 'Discount Code', 'Note'
  ];

  return headers[index] || null;
}
