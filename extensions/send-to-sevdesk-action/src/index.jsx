import { AdminAction, Button, Text, BlockStack, Select, Banner, Spinner, Divider } from '@shopify/ui-extensions-react/admin';
import { useState, useEffect } from 'react';

const INVOICE_TYPES = [
  { label: 'Invoice', value: 'invoice' },
  { label: 'Credit Note', value: 'credit_note' },
  { label: 'Proforma', value: 'proforma' },
];

// TODO: Integrate with backend API when available
// const orderId = useShopifyOrderId(); // Use Shopify hook to get order ID

export default function SendToSevDeskAction() {
  const [order, setOrder] = useState(null);
  const [invoiceType, setInvoiceType] = useState('invoice');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // TODO: Replace with actual API integration
    // fetchOrderDetails();
    setLoading(false);
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // TODO: Replace with actual API integration
      // const response = await fetch(`/api/orders/${orderId}/sync`, {
      //   method: 'POST',
      //   body: JSON.stringify({ invoiceType }),
      // });
      // const data = await response.json();
      // setResult({ success: true, data });
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.success) {
    return (
      <AdminAction title="Send to SevDesk">
        <Banner status="success">
          Order sent to SevDesk successfully!
        </Banner>
        <Text>Invoice: {result.data.invoiceNumber}</Text>
      </AdminAction>
    );
  }

  return (
    <AdminAction
      title="Send to SevDesk"
      primaryAction={
        <Button onPress={handleSubmit} loading={submitting}>
          Send to SevDesk
        </Button>
      }
    >
      <BlockStack gap="base">
        {result?.error && <Banner status="critical">{result.error}</Banner>}
        
        <Text variant="headingMd">Order Preview</Text>
        <Text>Customer: {order?.customer?.displayName || 'Loading...'}</Text>
        <Text>Total: {order?.totalPrice?.amount || 'Loading...'}</Text>
        <Text>Items: {order?.lineItems?.length || 0}</Text>
        
        <Divider />
        
        <Select
          label="Invoice Type"
          options={INVOICE_TYPES}
          value={invoiceType}
          onChange={setInvoiceType}
        />
      </BlockStack>
    </AdminAction>
  );
}
