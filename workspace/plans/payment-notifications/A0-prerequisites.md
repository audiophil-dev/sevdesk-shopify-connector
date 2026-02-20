# Prerequisites Checklist: Payment Notifications

**Ticket**: payment-notifications  
**Owner**: User (manual steps)  
**Purpose**: Environment setup before implementation can begin  
**Estimated Time**: 30 minutes (Shopify ready, Sevdesk later)

---

## Overview

This checklist contains all manual prerequisites. Some items are required immediately, others can be completed later. **Implementation can start now** with Shopify integration while Sevdesk API access is pending.

**Current Status**: Shopify credentials ready, Sevdesk blocked (plan change needed)

---

## Phase 1A: Shopify Setup (READY)

### 1.1 Shopify Setup

- [x] **Access Shopify Admin**
  - URL: https://admin.shopify.com/store/paurum-dev-shop/settings/organization-account
  - Need: Admin access to the store
  - Time: Immediate if you have access

- [x] **Create Custom App in Dev Dashboard**
  - Navigate to: https://dev.shopify.com/dashboard/
  - App URL: https://dev.shopify.com/dashboard/61316718/apps/325366284289
  - Name: `Sevdesk Connector`
  - Time: Done

- [x] **Configure API Scopes**
  - In the app, go to: Configuration → Admin API integration
  - Scopes configured:
    - `read_orders` - Find orders by customer email
    - `write_orders` - Update order financial status
    - `read_customers` - Read customer data
  - Time: Done

- [x] **Get Client Credentials**
  - **Client ID**: Obtained
  - **Client Secret**: Obtained (starts with `shpss_`)
  - Store securely in `.env` file
  - Time: Done

### 1.2 Authentication Method: Client Credentials Grant

**How it works** (from Shopify docs):
1. Your app requests a token using Client ID + Client Secret
2. Shopify returns an `access_token` valid for 24 hours
3. Your code caches the token and refreshes before expiry

**Token Request**:
```bash
POST https://paurum-dev-shop.myshopify.com/admin/oauth/access_token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET
```

**Token Response**:
```json
{
  "access_token": "f85632530bf277ec9ac6f649fc327f17",
  "scope": "read_orders,write_orders,read_customers",
  "expires_in": 86399
}
```

**Implementation** (handled by code):
```typescript
async function getShopifyToken() {
  // Cache token, refresh before 24h expiry
  const response = await fetch(
    `https://${SHOP}.myshopify.com/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    }
  );
  const { access_token, expires_in } = await response.json();
  return access_token;
}
```

---

## Phase 1B: Sevdesk Setup (BLOCKED - Plan Change Needed)

### 1.3 Sevdesk Setup

- [ ] **Upgrade Sevdesk Plan** (if needed for API access)
  - Check current plan supports API access
  - Upgrade if necessary
  - Time: Variable

- [ ] **Get Sevdesk API Key**
  - Log into Sevdesk
  - Navigate to: Settings → API
  - Generate or copy existing API key
  - Store securely
  - Time: 5 minutes (after plan upgrade)

---

## Phase 1C: Local Development Environment

- [ ] **Install Node.js 20.x LTS**
  - Download from: https://nodejs.org/
  - Verify: `node --version` should show v20.x.x
  - Time: 10 minutes

- [ ] **Install PostgreSQL**
  - Option A (recommended): Docker
    ```bash
    docker run --name sevdesk-postgres -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=sevdesk_sync -p 5432:5432 -d postgres:15
    ```
  - Option B: Native installation from https://www.postgresql.org/download/
  - Verify: `psql --version`
  - Time: 10-15 minutes

- [ ] **Create Local Database**
  ```bash
  # If using Docker (already created above)
  # If native:
  createdb sevdesk_sync
  ```
  - Time: 2 minutes

---

## Phase 2: Required Before Testing (Can Be Done Later)

### 2.1 Test Data

- [ ] **Create Test Order in Shopify**
  - Place an order with a known email address
  - Note the order number
  - Leave payment status as "pending" for testing
  - Time: 5 minutes

- [ ] **Create Test Invoice in Sevdesk**
  - Create invoice with same customer email as Shopify test order
  - Note the invoice ID
  - Leave unpaid for testing payment notification
  - Time: 5 minutes

### 2.2 Test Payment Flow

- [ ] **Mark Sevdesk Invoice as Paid**
  - This triggers the payment notification flow
  - Verify connector picks it up (via polling)
  - Time: 2 minutes

---

## Phase 3: Required Before Production Deployment (Non-Blocking for Dev)

### 3.1 Uberspace Account

- [ ] **Create Uberspace Account**
  - URL: https://uberspace.de/
  - Choose: Uberspace 7
  - Cost: EUR 6-9/month (pay what you want model)
  - Time: 10 minutes

- [ ] **Set Up PostgreSQL on Uberspace**
  ```bash
  uberspace tools version use postgresql 15
  createdb sevdesk_sync
  ```
  - Time: 5 minutes

- [ ] **Configure Domain** (optional)
  - Use default Uberspace subdomain, or
  - Configure custom domain
  - Time: 5-15 minutes

---

## Credentials Template

Create a `.env` file in the project root with these values:

```bash
# Shopify (Client Credentials Grant)
SHOPIFY_SHOP=paurum-dev-shop              # without .myshopify.com
SHOPIFY_CLIENT_ID=your_client_id          # from Dev Dashboard
SHOPIFY_CLIENT_SECRET=shpss_xxxxxxxxxxxx  # from Dev Dashboard

# Sevdesk (add when available)
SEVDESK_API_KEY=                          # leave empty for now

# Database (local development)
DATABASE_URL=postgresql://postgres:dev@localhost:5432/sevdesk_sync

# App Configuration
NODE_ENV=development
PORT=3000
POLL_INTERVAL_MS=60000
ENABLE_POLLING=false                      # disable until Sevdesk ready

# Optional (Phase 2)
SENTRY_DSN=
```

**Important**: 
- Never commit `.env` to git
- Access tokens are obtained programmatically (24h expiry, auto-refresh)
- Production credentials go on Uberspace server only

---

## What Can Be Started Now

**Ready to implement (not blocked):**
- Project setup (package.json, tsconfig, directories)
- Express server with health endpoint
- PostgreSQL database schema
- Shopify GraphQL client (client credentials grant)
- Order lookup by customer email
- Order status update to "paid"
- Email triggering tests

**Blocked until Sevdesk API available:**
- Sevdesk API client
- Polling job for payment detection
- End-to-end payment notification flow

---

## Verification Checklist

Before proceeding to implementation, verify:

- [x] Shopify Dev Dashboard app created
- [x] Client ID and Client Secret obtained
- [x] API scopes configured (read_orders, write_orders, read_customers)
- [ ] PostgreSQL is running and accessible
- [ ] Node.js 20.x is installed
- [ ] `.env` file created with Shopify credentials

---

## Quick Verification Commands

```bash
# Test Shopify token acquisition (client credentials grant)
curl -X POST "https://paurum-dev-shop.myshopify.com/admin/oauth/access_token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"

# Expected response:
# {"access_token":"...","scope":"read_orders,write_orders,read_customers","expires_in":86399}

# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"

# Test Node.js version
node --version  # Should be v20.x.x
```

---

## Implementation Can Start

**Once Node.js and PostgreSQL are ready**, the implementing agent can begin:

1. **A2-plan.md** (partial - Shopify focused):
   - Project setup
   - Express server
   - Database schema
   - Shopify client (client credentials grant)

2. **A3-plan.md** (full):
   - Order lookup by email
   - Order status update
   - Email triggering

**Sevdesk integration will be added** when API access is available.

---

**Last Updated**: 2026-02-20  
**Status**: Shopify ready, Sevdesk pending (plan change needed)
