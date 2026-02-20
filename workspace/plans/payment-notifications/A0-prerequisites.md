# Prerequisites Checklist: Payment Notifications

**Ticket**: payment-notifications  
**Owner**: User (manual steps)  
**Purpose**: Environment setup before implementation can begin  
**Estimated Time**: 45-60 minutes

---

## Overview

This checklist contains all manual prerequisites that must be completed before the implementation plan (A2-plan.md) can be executed. The implementing agent cannot proceed until these items are complete.

---

## Phase 1: Required Before Development (Blocking)

### 1.1 Shopify Setup

- [ ] **Access Shopify Admin**
  - URL: Your store's admin URL (e.g., `your-store.myshopify.com/admin`)
  - Need: Admin access to the store
  - Time: Immediate if you have access

- [ ] **Create Custom App**
  - Navigate to: Settings → Apps and sales channels → Develop apps
  - Click: "Create an app"
  - Name: `Sevdesk Payment Notifier` (or your preference)
  - Time: 2 minutes

- [ ] **Configure API Scopes**
  - In the app, go to: Configuration → Admin API integration
  - Select scopes:
    - `read_orders` - Find orders by customer email
    - `write_orders` - Update order financial status
    - `read_customers` - Read customer data
  - Save configuration
  - Time: 3 minutes

- [ ] **Install App and Get Credentials**
  - Click: "Install app"
  - Copy and save:
    - **Admin API access token** (starts with `shpat_`)
    - **API key** (starts with `shp_`)
    - **API secret key**
  - Store securely - you'll need these for `.env` file
  - Time: 5 minutes

### 1.2 Sevdesk Setup

- [ ] **Get Sevdesk API Key**
  - Log into Sevdesk
  - Navigate to: Settings → API
  - Generate or copy existing API key
  - Store securely
  - Time: 5 minutes

- [ ] **Note Your Sevdesk ID**
  - Find your Sevdesk user/contact ID
  - Needed for invoice creation (if implementing Shopify → Sevdesk later)
  - Time: 2 minutes

### 1.3 Local Development Environment

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

- [ ] **Install Git** (if not already installed)
  - Verify: `git --version`
  - Time: 5 minutes

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
# Shopify
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxx
SHOPIFY_API_KEY=shp_xxxxxxxxxxxx
SHOPIFY_API_SECRET=shpss_xxxxxxxxxxxx

# Sevdesk
SEVDESK_API_KEY=xxxxxxxxxxxx

# Database (local development)
DATABASE_URL=postgresql://postgres:dev@localhost:5432/sevdesk_sync

# App Configuration
NODE_ENV=development
PORT=3000
POLL_INTERVAL_MS=60000

# Optional (Phase 2)
SENTRY_DSN=
```

**Important**: 
- Never commit `.env` to git
- `.env.example` template will be created by implementation plan
- Production credentials go on Uberspace server only

---

## Verification Checklist

Before proceeding to A2-plan.md, verify:

- [ ] Can connect to Shopify API with access token
- [ ] Can connect to Sevdesk API with API key
- [ ] PostgreSQL is running and accessible
- [ ] Node.js 20.x is installed
- [ ] `.env` file created with all required values

---

## Quick Verification Commands

```bash
# Test Shopify API access
curl -X GET "https://your-store.myshopify.com/admin/api/2024-01/shop.json" \
  -H "X-Shopify-Access-Token: shpat_xxxxxxxxxxxx"

# Test Sevdesk API access
curl -X GET "https://my.sevdesk.de/api/v1/Contact" \
  -H "Authorization: api_key YOUR_API_KEY"

# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"

# Test Node.js version
node --version  # Should be v20.x.x
```

---

## When Complete

Once all Phase 1 items are checked off:
1. Inform the implementing agent that prerequisites are complete
2. Agent will begin A2-plan.md execution
3. Phase 2 (test data) can be created during implementation

---

**Last Updated**: 2026-02-20  
**Status**: Ready for user completion
