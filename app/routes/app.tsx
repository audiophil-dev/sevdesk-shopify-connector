import { Outlet, useNavigation } from '@remix-run/react';
import { AppProvider } from '@shopify/shopify-app-remix/react';
import { NavigationMenu } from '@shopify/shopify-app-remix/react';

export default function App() {
  return (
    <AppProvider>
      <NavigationMenu
        navigationLinks={[
          { label: 'Dashboard', destination: '/app' },
          { label: 'Settings', destination: '/app/settings' },
        ]}
      />
      <Outlet />
    </AppProvider>
  );
}
