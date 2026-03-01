import { Page, Layout, Card, FormLayout, TextField, Button, ChoiceList, Banner } from '@shopify/polaris';
import { useState } from 'react';
import { useActionData, useNavigation, Form } from '@remix-run/react';

// TODO: Integrate with backend API when available
export async function loader({ request }) {
  // const { session } = await authenticate.admin(request);
  // const settings = await db.appSettings.findUnique({
  //   where: { shopId: session.shop }
  // });
  // return json({ settings });
  
  return json({ settings: null });
}

export async function action({ request }) {
  // const { session } = await authenticate.admin(request);
  // const formData = await request.formData();
  
  // const settings = await db.appSettings.upsert({
  //   where: { shopId: session.shop },
  //   update: {
  //     sevdeskApiKey: formData.get('apiKey'),
  //     syncMode: formData.get('syncMode'),
  //     defaultInvoiceType: formData.get('invoiceType'),
  //     revenueAccount: formData.get('revenueAccount'),
  //   },
  //   create: {
  //     shopId: session.shop,
  //     sevdeskApiKey: formData.get('apiKey'),
  //     syncMode: formData.get('syncMode'),
  //     defaultInvoiceType: formData.get('invoiceType'),
  //   }
  // });
  
  return json({ success: false, settings: null });
}

export default function Settings() {
  const navigation = useNavigation();
  const actionData = useActionData();
  const [testingConnection, setTestingConnection] = useState(false);
  
  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      // const response = await fetch('/api/settings/test-connection', { method: 'POST' });
      // Show result
    } catch (err) {
      console.error('Connection test failed:', err);
    } finally {
      setTestingConnection(false);
    }
  };
  
  return (
    <Page title="Settings" backAction={{ content: 'Dashboard', url: '/app' }}>
      <Layout>
        {actionData?.success && (
          <Layout.Section>
            <Banner status="success">Settings saved successfully</Banner>
          </Layout.Section>
        )}
        
        <Layout.Section>
          <Form method="post">
            <Card>
              <FormLayout>
                <TextField
                  label="SevDesk API Key"
                  type="password"
                  name="apiKey"
                  helpText="Find your API key in SevDesk settings"
                />
                <Button onClick={handleTestConnection} loading={testingConnection}>
                  Test Connection
                </Button>
              </FormLayout>
            </Card>
            
            <Card title="Sync Settings">
              <FormLayout>
                <ChoiceList
                  name="syncMode"
                  title="Sync Mode"
                  choices={[
                    { label: 'Automatic - Sync new orders immediately', value: 'automatic' },
                    { label: 'Manual - Sync orders on demand', value: 'manual' },
                  ]}
                />
                <TextField
                  label="Default Invoice Type"
                  name="invoiceType"
                  type="text"
                  helpText="RE, GUT, or REK"
                />
              </FormLayout>
            </Card>
            
            <Card title="Account Mapping">
              <FormLayout>
                <TextField
                  label="Revenue Account"
                  name="revenueAccount"
                  helpText="SevDesk account number for revenue"
                />
                <TextField
                  label="Tax Account"
                  name="taxAccount"
                  helpText="SevDesk account number for taxes"
                />
              </FormLayout>
            </Card>
            
            <Button submit primary loading={navigation.state === 'submitting'}>
              Save Settings
            </Button>
          </Form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
