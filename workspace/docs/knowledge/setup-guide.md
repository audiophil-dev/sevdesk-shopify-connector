# Setup Guide

This guide covers setting up the Shopify-Sevdesk Payment Notifier for local development.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Shopify store with Admin API access
- Sevdesk account with API access

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd sevdesk-shopify-connector
npm install
```

## Step 2: Set Up PostgreSQL

### Option A: Docker (Recommended for Local Development)

```bash
# Start PostgreSQL container
docker run -d \
  --name sevdesk-postgres \
  -e POSTGRES_USER=sevdesk \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=sevdesk_sync \
  -p 5432:5432 \
  postgres:14
```

### Option B: Native PostgreSQL

1. Install PostgreSQL for your OS
2. Create database:

```bash
createdb sevdesk_sync
```

## Step 3: Configure Shopify

### Option A: Dev Dashboard App (OAuth Token Caching)

This option uses the Shopify Dev Dashboard to obtain an OAuth token automatically. The token is cached locally and refreshed when expired.

1. Create an app in the [Shopify Dev Dashboard](https://dev-dashboard.shopify.com/)
2. Configure Admin API scopes:
   - `read_orders`
   - `write_orders`
   - `read_customers`
3. Install the app on your store
4. Copy the Client ID and Client Secret from the app credentials

The system will automatically:
- Request an OAuth token on first run and cache it in `.shopify-token.json`
- Tokens are valid for 24 hours and automatically refreshed when expired

### Option B: Custom App (Direct Access Token)

This option uses a direct Admin API access token from a custom app.

1. Log in to your Shopify admin
2. Go to Settings > Apps and sales channels > Develop apps
3. Click "Create an app" > "Create an app"
4. Configure Admin API scopes:
   - `read_orders`
   - `write_orders`
   - `read_customers`
5. Install the app and copy the access token
6. Add to `.env`: `SHOPIFY_ACCESS_TOKEN=shpat_xxx`

### Token Storage

- OAuth tokens are cached in `.shopify-token.json` (auto-generated, git-ignored)
- Tokens expire after 24 hours and are automatically refreshed
- If you encounter Cloudflare challenges, use Option B (direct access token)

## Step 4: Configure Sevdesk

1. Log in to Sevdesk
2. Go to Settings > API
3. Create a new API key
4. Copy the API key

## Step 5: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Shopify Configuration (Option A: OAuth - Dev Dashboard App)
SHOPIFY_SHOP=your-shop-name
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret

# OR Shopify Configuration (Option B: Direct Token - Custom App)
SHOPIFY_SHOP=your-shop-name
SHOPIFY_ACCESS_TOKEN=shpat_your_access_token

# Sevdesk Configuration
SEVDESK_API_KEY=your_sevdesk_api_key

# Database Configuration
DATABASE_URL=postgresql://sevdesk:your_password@localhost:5432/sevdesk_sync

# Optional
PORT=3000
POLL_INTERVAL_MS=60000
ENABLE_POLLING=true
DRY_RUN=true  # Set to false for production
```

## Step 6: Run Migrations

```bash
npm run migrate
```

This creates the required database tables:
- `notification_history` - Tracks sent notifications

## Step 7: Start the Server

```bash
# Development mode
npm run dev

# Or build and run
npm run build
npm start
```

## Verification

1. Check server started: `curl http://localhost:3000/health`
2. Check logs for: `[poller] Starting polling every X ms`
3. Create a test invoice in Sevdesk and mark it as paid
4. Watch logs for invoice processing

## Troubleshooting

### Database Connection Failed

- Check PostgreSQL is running: `docker ps` or `pg_isready`
- Verify DATABASE_URL in .env

### Shopify API Errors

- Verify access token has correct scopes
- Check token hasn't expired

### Sevdesk API Errors

- Verify API key is correct
- Check API key has required permissions
