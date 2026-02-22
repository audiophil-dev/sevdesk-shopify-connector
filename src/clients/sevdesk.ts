import { config } from '../config';
import { 
  SevdeskInvoice, 
  SevdeskInvoiceResponse,
  SevdeskContact,
  SevdeskContactResponse 
} from '../types/sevdesk';

export class SevdeskClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.sevdesk.baseUrl;
    this.apiKey = config.sevdesk.apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sevdesk API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async getInvoice(invoiceId: string): Promise<SevdeskInvoice> {
    const response = await this.request<SevdeskInvoiceResponse>(
      `/Invoice/${invoiceId}`
    );
    
    if (response.objects.length === 0) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }
    
    return response.objects[0];
  }

  async getPaidInvoices(since?: Date): Promise<SevdeskInvoice[]> {
    // Sevdesk uses numeric status codes: 1000 = Paid
    // We fetch all paid invoices and filter by update time in memory
    // This is more reliable than invoiceDateFrom which filters by creation date
    const endpoint = '/Invoice?status=1000&limit=100';
    
    const response = await this.request<SevdeskInvoiceResponse>(endpoint);
    
    let invoices = response.objects;
    
    // Filter by update time if provided
    // This ensures we only process invoices whose status changed recently
    if (since) {
      const sinceTime = since.getTime();
      invoices = invoices.filter(invoice => {
        if (!invoice.update) {
          // If no update time, include it (safety net)
          return true;
        }
        const updateTime = new Date(invoice.update).getTime();
        return updateTime >= sinceTime;
      });
    }
    
    console.log(`[sevdesk] Found ${invoices.length} paid invoices updated since ${since?.toISOString() || 'ever'}`);
    
    return invoices;
  }

  async getInvoiceContact(contactId: string): Promise<SevdeskContact> {
    const response = await this.request<SevdeskContactResponse>(
      `/Contact/${contactId}`
    );
    
    if (response.objects.length === 0) {
      throw new Error(`Contact not found: ${contactId}`);
    }
    
    return response.objects[0];
  }

  async searchInvoicesByCustomerEmail(email: string): Promise<SevdeskInvoice[]> {
    const endpoint = `/Invoice?contact[objectName]=Contact&contact[value][email]=${encodeURIComponent(email)}`;
    
    const response = await this.request<SevdeskInvoiceResponse>(endpoint);
    
    return response.objects;
  }
}

export const sevdeskClient = new SevdeskClient();
