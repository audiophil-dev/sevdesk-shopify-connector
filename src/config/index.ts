import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.development (local dev) or .env
// First try .env.development, then fall back to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface Config {
  shopify: {
    shop: string;
    clientId: string;
    clientSecret: string;
    accessToken?: string; // Direct access token for custom apps
  };
  sevdesk: {
    apiKey: string;
    baseUrl: string;
  };
  database: {
    url: string;
  };
  server: {
    port: number;
  };
  polling: {
    intervalMs: number;
    enabled: boolean;
  };
}

export const config: Config = {
  shopify: {
    shop: process.env.SHOPIFY_SHOP || '',
    clientId: process.env.SHOPIFY_CLIENT_ID || '',
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  },
  sevdesk: {
    apiKey: process.env.SEVDESK_API_KEY || '',
    baseUrl: 'https://my.sevdesk.de/api/v1',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  polling: {
    intervalMs: parseInt(process.env.POLL_INTERVAL_MS || '60000', 10),
    enabled: process.env.ENABLE_POLLING === 'true',
  },
};

// Validate required config
const required = [
  'shopify.shop',
  'shopify.clientId',
  'shopify.clientSecret',
  'sevdesk.apiKey',
  'database.url',
];

const missing = required.filter(key => {
  const [section, field] = key.split('.');
  const sectionConfig = config[section as keyof Config];
  return !(sectionConfig as Record<string, unknown>)[field];
});

if (missing.length > 0) {
  console.warn(`Missing required config: ${missing.join(', ')}`);
}
