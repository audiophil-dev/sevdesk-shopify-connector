import { config } from '../config';
import { sevdeskClient } from '../clients/sevdesk';
import { processPaidInvoice } from './processor';

let pollingInterval: NodeJS.Timeout | null = null;
let lastCheckTime: Date | null = null;

export function startPolling(): void {
  if (pollingInterval) {
    console.log('[poller] Polling already running');
    return;
  }

  const intervalMs = config.polling.intervalMs;
  console.log(`[poller] Starting polling every ${intervalMs}ms`);

  // Run immediately on start
  checkForPaidInvoices();

  // Then run on interval
  pollingInterval = setInterval(() => {
    checkForPaidInvoices();
  }, intervalMs);
}

export function stopPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('[poller] Stopped polling');
  }
}

async function checkForPaidInvoices(): Promise<void> {
  try {
    const since = lastCheckTime || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours
    
    console.log(`[poller] Checking for paid invoices since ${since.toISOString()}`);
    
    const paidInvoices = await sevdeskClient.getPaidInvoices(since);
    
    lastCheckTime = new Date();
    
    if (paidInvoices.length === 0) {
      console.log('[poller] No new paid invoices found');
      return;
    }
    
    console.log(`[poller] Found ${paidInvoices.length} paid invoices`);
    
    for (const invoice of paidInvoices) {
      await processPaidInvoice(invoice);
    }
  } catch (error) {
    console.error('[poller] Error checking for paid invoices:', error);
  }
}
