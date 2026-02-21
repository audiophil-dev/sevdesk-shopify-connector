export interface SevdeskInvoice {
  id: string;
  invoiceNumber: string;
  status: '100' | '200' | '300' | '400' | '500' | '1000'; // Sevdesk status codes: 100=Draft, 200=Sent, 300=Partial, 400=Cancelled, 500=Overdue, 1000=Paid
  total: number;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  contact: {
    id: string;
    objectName: string;
  };
}

export interface SevdeskContact {
  id: string;
  name: string;
  surename?: string;
  emailPersonal?: string | null;
  emailWork?: string | null;
}

export interface SevdeskInvoiceResponse {
  objects: SevdeskInvoice[];
  total: number;
}

export interface SevdeskContactResponse {
  objects: SevdeskContact[];
  total: number;
}
