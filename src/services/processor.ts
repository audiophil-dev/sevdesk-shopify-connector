import { SevdeskInvoice } from '../types/sevdesk';
import { sevdeskClient } from '../clients/sevdesk';
import { shopifyClient } from '../clients/shopify';

export async function processPaidInvoice(invoice: SevdeskInvoice): Promise<void> {
  console.log(`[processor] Processing invoice ${invoice.invoiceNumber} for contact ${invoice.contactId}`);
  
  try {
    // Get customer contact from Sevdesk
    const contact = await sevdeskClient.getInvoiceContact(invoice.contactId);
    
    console.log(`[processor] Found customer: ${contact.name} (${contact.email})`);
    
    // Search for matching order in Shopify by email
    const orders = await shopifyClient.getOrders(50);
    
    // Find orders matching the customer's email
    const matchingOrders = orders.orders.edges
      .map(edge => edge.node)
      .filter(order => order.email && order.email.toLowerCase() === contact.email.toLowerCase());
    
    if (matchingOrders.length === 0) {
      console.log(`[processor] No matching Shopify order found for ${contact.email}`);
      return;
    }
    
    console.log(`[processor] Found ${matchingOrders.length} matching orders in Shopify`);
    
    // For now, just log what we would do
    for (const order of matchingOrders) {
      console.log(`[processor] Would update order ${order.name} (${order.id}) to paid status`);
      console.log(`[processor] Would send payment notification to ${contact.email}`);
    }
  } catch (error) {
    console.error(`[processor] Error processing invoice ${invoice.invoiceNumber}:`, error);
  }
}
