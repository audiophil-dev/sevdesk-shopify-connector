export interface SevdeskInvoice {
  id: string;
  invoiceNumber: string;
  status: 'paid' | 'unpaid' | 'overdue';
  total: number;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  contactId: string;
}

export interface SevdeskContact {
  id: string;
  email: string;
  name: string;
}

export interface SevdeskInvoiceResponse {
  objects: SevdeskInvoice[];
  total: number;
}

export interface SevdeskContactResponse {
  objects: SevdeskContact[];
  total: number;
}
