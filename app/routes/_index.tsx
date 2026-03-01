import { Page, Layout, Card, Text, InlineGrid, Badge, DataTable } from '@shopify/polaris';
import { useLoaderData } from '@remix-run/react';

export async function loader({ request }) {
  // TODO: Integrate with backend API when available
  // const { session } = await authenticate.admin(request);
  
  // Placeholder data
  const stats = {
    synced: 0,
    pending: 0,
    error: 0
  };
  
  const recentActivity = [];
  
  return json({ stats, recentActivity });
}

export default function Dashboard() {
  const { stats, recentActivity } = useLoaderData();
  
  return (
    <Page title="SevDesk Connector" subtitle="Dashboard">
      <Layout>
        <Layout.Section>
          <InlineGrid columns={3} gap="400">
            <Card>
              <Text variant="headingMd" as="h2">Synced</Text>
              <Text variant="heading2xl">{stats.synced}</Text>
            </Card>
            <Card>
              <Text variant="headingMd" as="h2">Pending</Text>
              <Text variant="heading2xl">{stats.pending}</Text>
            </Card>
            <Card>
              <Text variant="headingMd" as="h2">Errors</Text>
              <Text variant="heading2xl">{stats.error}</Text>
            </Card>
          </InlineGrid>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h2">Recent Activity</Text>
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'text']}
              headings={['Order', 'Status', 'Invoice', 'Time']}
              rows={recentActivity.map(a => [
                `#${a.orderName || 'N/A'}`,
                <Badge status={a.status === 'synced' ? 'success' : 'critical'}>{a.status || 'pending'}</Badge>,
                a.invoiceNumber || '-',
                new Date(a.createdAt).toLocaleString()
              ])}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
