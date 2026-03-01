import { AdminBlock, Button, Text, BlockStack, Badge, Spinner, Banner, Link } from '@shopify/ui-extensions-react/admin';
import { useState, useEffect } from 'react';

// TODO: Integrate with backend API when available
// const orderId = useShopifyOrderId(); // Use Shopify hook to get order ID

export default function SevDeskOrderBlock() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // TODO: Replace with actual API integration
    // fetchOrderStatus();
  }, []);

  // TODO: Replace with actual API integration
  const fetchOrderStatus = async () => {
    try {
      // const response = await fetch(`/api/orders/${orderId}/sevdesk-status`);
      // const data = await response.json();
      // setStatus(data);
    } catch (err) {
      setError('Failed to load sync status');
    } finally {
      setLoading(false);
    }
  };

  // TODO: Replace with actual API integration
  const handleSync = async () => {
    setSyncing(true);
    try {
      // await fetch(`/api/orders/${orderId}/sync`, { method: 'POST' });
      // await fetchOrderStatus();
    } catch (err) {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <AdminBlock title="SevDesk">
      <BlockStack gap="base">
        {error && <Banner status="critical">{error}</Banner>}
        
        {status?.status === 'synced' && (
          <>
            <Badge status="success">Synced</Badge>
            <Text>Invoice: {status.invoiceNumber}</Text>
            <Link url={status.sevdeskUrl}>View in SevDesk</Link>
          </>
        )}
        
        {status?.status === 'pending' && (
          <Badge status="info">Pending sync</Badge>
        )}
        
        {status?.status === 'error' && (
          <>
            <Badge status="critical">Error</Badge>
            <Text>{status.errorMessage}</Text>
          </>
        )}
        
        {status?.status === 'never_synced' && (
          <Badge>Not synced</Badge>
        )}
        
        <Button onPress={handleSync} loading={syncing}>
          Sync now
        </Button>
      </BlockStack>
    </AdminBlock>
  );
}
