# Custom App Implementation Guide

**Purpose**: Step-by-step guide to build a custom Shopify app for Sevdesk integration
**Audience**: Developer implementing the connector
**Prerequisites**: Node.js knowledge, Shopify store admin access, Sevdesk account

---

## Overview

This guide walks through building a custom Shopify app that:
1. Receives Shopify webhooks when orders are created/paid
2. Creates invoices in Sevdesk via API
3. Receives Sevdesk webhooks when payments are recorded
4. Updates Shopify order status when offline payments arrive

---

## Part 1: Create Custom App in Shopify

### Step 1.1: Create the App

1. Log in to Shopify Admin
2. Go to **Settings** > **Apps and sales channels**
3. Click **Develop apps** (bottom of page)
4. Click **Create an app**
5. Name it: `Sevdesk Sync`
6. Click **Create app**

### Step 1.2: Configure API Scopes

1. In the app, click **Configuration**
2. Under **Admin API integration**, click **Configure**
3. Select these scopes:

| Scope | Access | Purpose |
|-------|--------|---------|
| `read_orders` | Read | Receive order webhooks |
| `write_orders` | Write | Update order status |
| `read_customers` | Read | Get customer data for invoices |
| `read_transactions` | Read | Access payment info |

4. Click **Save**

### Step 1.3: Install and Get Credentials

1. Click **Install app**
2. Confirm installation
3. **Immediately save the Admin API access token** (shown only once)
4. Note the API key and secret from the Credentials tab

### Step 1.4: Get Webhook Secret

1. Go to **Configuration** > **Webhooks**
2. Note the **Webhook signing secret** - needed for signature verification

---

## Part 2: Project Setup

### Step 2.1: Initialize Project

```bash
mkdir sevdesk-sync
cd sevdesk-sync
npm init -y
npm install express crypto dotenv
```

### Step 2.2: Project Structure

```
sevdesk-sync/
├── src/
│   ├── index.js           # Main server
│   ├── routes/
│   │   └── webhooks.js    # Webhook handlers
│   ├── services/
│   │   ├── shopify.js     # Shopify API client
│   │   └── sevdesk.js     # Sevdesk API client
│   └── utils/
│       └── verify.js      # Webhook signature verification
├── .env                   # Environment variables (not in git)
├── .env.example           # Template for env vars
├── package.json
└── README.md
```

### Step 2.3: Environment Variables

Create `.env.example`:

```env
# Shopify
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_WEBHOOK_SECRET=whsec_xxxxx

# Sevdesk
SEVDESK_API_KEY=xxxxx
SEVDESK_BASE_URL=https://my.sevdesk.de/api/v1

# Server
PORT=3000
NODE_ENV=production
```

---

## Part 3: Core Implementation

### Step 3.1: Main Server (src/index.js)

```javascript
require('dotenv').config();
const express = require('express');
const webhookRoutes = require('./routes/webhooks');

const app = express();

// Raw body parser for webhook signature verification
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 3.2: Webhook Verification (src/utils/verify.js)

```javascript
const crypto = require('crypto');

function verifyShopifyWebhook(rawBody, signature, secret) {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(hmac, 'base64'),
    Buffer.from(signature, 'base64')
  );
}

module.exports = { verifyShopifyWebhook };
```

### Step 3.3: Sevdesk Service (src/services/sevdesk.js)

```javascript
const SEVDESK_BASE_URL = process.env.SEVDESK_BASE_URL;
const SEVDESK_API_KEY = process.env.SEVDESK_API_KEY;

async function sevdeskRequest(endpoint, options = {}) {
  const url = `${SEVDESK_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': SEVDESK_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sevdesk API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function findOrCreateContact(email, customerData) {
  // Search for existing contact
  const contacts = await sevdeskRequest(
    `/Contact?email=${encodeURIComponent(email)}`
  );
  
  if (contacts.objects && contacts.objects.length > 0) {
    return contacts.objects[0];
  }

  // Create new contact
  const newContact = await sevdeskRequest('/Contact', {
    method: 'POST',
    body: JSON.stringify({
      name: `${customerData.first_name} ${customerData.last_name}`,
      customerNumber: customerData.id,
      email: email,
    }),
  });

  return newContact.objects;
}

async function createInvoice(order, contactId) {
  const invoice = await sevdeskRequest('/Invoice', {
    method: 'POST',
    body: JSON.stringify({
      invoiceDate: order.created_at.split('T')[0],
      deliveryDate: order.created_at.split('T')[0],
      contact: { id: contactId, objectName: 'Contact' },
      invoiceType: 'RE',
      status: 100, // Draft
      address: {
        name: `${order.billing_address.first_name} ${order.billing_address.last_name}`,
        street: order.billing_address.address1,
        zip: order.billing_address.zip,
        city: order.billing_address.city,
        country: order.billing_address.country_code,
      },
      invoicePos: order.line_items.map(item => ({
        name: item.title,
        quantity: item.quantity,
        unitPrice: parseFloat(item.price),
        taxRate: 19, // Adjust based on your tax setup
      })),
    }),
  });

  return invoice.objects;
}

module.exports = {
  findOrCreateContact,
  createInvoice,
};
```

### Step 3.4: Shopify Service (src/services/shopify.js)

```javascript
const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function shopifyRequest(endpoint, options = {}) {
  const url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shopify API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function updateOrderFinancialStatus(orderId, status) {
  return shopifyRequest(`/orders/${orderId}.json`, {
    method: 'PUT',
    body: JSON.stringify({
      order: {
        id: orderId,
        financial_status: status,
      },
    }),
  });
}

module.exports = {
  updateOrderFinancialStatus,
};
```

### Step 3.5: Webhook Routes (src/routes/webhooks.js)

```javascript
const express = require('express');
const router = express.Router();
const { verifyShopifyWebhook } = require('../utils/verify');
const { findOrCreateContact, createInvoice } = require('../services/sevdesk');

// Shopify webhook handler
router.post('/shopify', async (req, res) => {
  const signature = req.headers['x-shopify-hmac-sha256'];
  const topic = req.headers['x-shopify-topic'];
  
  // Verify signature
  if (!verifyShopifyWebhook(req.body, signature, process.env.SHOPIFY_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const data = JSON.parse(req.body.toString());
  
  try {
    if (topic === 'orders/paid' || topic === 'orders/create') {
      const order = data;
      
      // Find or create contact
      const contact = await findOrCreateContact(order.email, order.customer);
      
      // Create invoice
      const invoice = await createInvoice(order, contact.id);
      
      console.log(`Created invoice ${invoice.id} for order ${order.id}`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error');
  }
});

// Sevdesk webhook handler (for payment notifications)
router.post('/sevdesk', async (req, res) => {
  // TODO: Implement Sevdesk webhook handling
  // 1. Verify Sevdesk signature
  // 2. Extract invoice ID and payment status
  // 3. Find corresponding Shopify order
  // 4. Update Shopify order financial status
  
  res.status(200).send('OK');
});

module.exports = router;
```

---

## Part 4: Register Webhooks

### Step 4.1: Register Shopify Webhook

Use the Shopify API or run this script once:

```javascript
// scripts/register-webhook.js
require('dotenv').config();

async function registerWebhook() {
  const response = await fetch(
    `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01/webhooks.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook: {
          topic: 'orders/paid',
          address: 'https://your-app.railway.app/webhooks/shopify',
          format: 'json',
        },
      }),
    }
  );
  
  console.log(await response.json());
}

registerWebhook();
```

Run with: `node scripts/register-webhook.js`

---

## Part 5: Deploy to Uberspace

### Step 5.1: Create Uberspace Account

1. Go to [uberspace.de](https://uberspace.de)
2. Click **Join** to create an account
3. Choose your username (becomes `username.uber.space`)
4. First month is free - no payment required initially

### Step 5.2: SSH into Your Uberspace

```bash
# SSH into your server
ssh username@username.uber.space

# You'll be in your home directory
# /home/username/
```

### Step 5.3: Set Up Node.js

```bash
# Check available Node.js versions
uberspace tools version list node

# Set Node.js version (22 is default, LTS recommended)
uberspace tools version use node 20

# Verify version
node --version
```

### Step 5.4: Upload Your Code

**Option A: Clone from GitHub**
```bash
# In your Uberspace SSH session
git clone https://github.com/yourusername/sevdesk-sync.git
cd sevdesk-sync
npm install
```

**Option B: Upload via SCP/SFTP**
```bash
# From your local machine
scp -r ./sevdesk-sync username@username.uber.space:/home/username/
```

### Step 5.5: Configure Environment Variables

```bash
# Create .env file
cd ~/sevdesk-sync
cat > .env << 'EOF'
# Shopify
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_WEBHOOK_SECRET=whsec_xxxxx

# Sevdesk
SEVDESK_API_KEY=xxxxx
SEVDESK_BASE_URL=https://my.sevdesk.de/api/v1

# Server
PORT=3000
NODE_ENV=production
EOF
```

### Step 5.6: Create Supervisord Configuration

Uberspace uses supervisord to keep your Node.js app running:

```bash
# Create the services directory if it doesn't exist
mkdir -p ~/etc/services.d

# Create the daemon configuration
cat > ~/etc/services.d/sevdesk-sync.ini << 'EOF'
[program:sevdesk-sync]
directory=/home/username/sevdesk-sync
command=node src/index.js
autostart=true
autorestart=true
environment=NODE_ENV=production
stdout_logfile=/home/username/sevdesk-sync/logs/stdout.log
stderr_logfile=/home/username/sevdesk-sync/logs/stderr.log
EOF

# Create logs directory
mkdir -p ~/sevdesk-sync/logs
```

### Step 5.7: Register and Start the Service

```bash
# Tell supervisord to read the new config
supervisorctl reread

# Start the service
supervisorctl update

# Check status
supervisorctl status

# You should see:
# sevdesk-sync    RUNNING   pid 12345, uptime 0:00:05
```

### Step 5.8: Connect to Web Server

```bash
# Choose a port (1024-65535)
# Let's use 13000 for example

# First, update your .env with the chosen port
# PORT=13000

# Then connect the web backend
uberspace web backend set / --http --port 13000

# Verify
uberspace web backend list
```

### Step 5.9: Test the Deployment

```bash
# Test health endpoint
curl https://username.uber.space/health

# Should return: {"status":"ok","timestamp":"..."}
```

### Step 5.10: Set Up PostgreSQL (Optional but Recommended)

```bash
# Create PostgreSQL database
uberspace database create postgresql sevdesk

# Note the connection details
# Then add to your .env:
# DATABASE_URL=postgresql://username:password@localhost/sevdesk
```

---

## Part 6: Register Webhooks

### Step 6.1: Register Shopify Webhook

Run this script once to register the webhook:

```javascript
// scripts/register-webhook.js
require('dotenv').config();

async function registerWebhook() {
  const response = await fetch(
    `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2024-01/webhooks.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook: {
          topic: 'orders/paid',
          address: 'https://username.uber.space/webhooks/shopify',
          format: 'json',
        },
      }),
    }
  );
  
  console.log(await response.json());
}

registerWebhook();
```

Run with: `node scripts/register-webhook.js`

---

## Part 7: Testing

### Step 7.1: Test Webhook Locally

Use ngrok for local testing:

```bash
ngrok http 3000
```

Use the ngrok URL to register webhooks for testing.

### Step 7.2: Create Test Order

1. Create a test order in Shopify
2. Check logs for webhook receipt
3. Verify invoice created in Sevdesk

### Step 7.3: View Logs on Uberspace

```bash
# View stdout logs
tail -f ~/sevdesk-sync/logs/stdout.log

# View stderr logs
tail -f ~/sevdesk-sync/logs/stderr.log

# View supervisord status
supervisorctl status sevdesk-sync
```

---

## Part 8: Critical Security Checklist

Before deploying to production, verify all critical mitigations are in place:

### Required Before Production

| Item | Status | Notes |
|------|--------|-------|
| HMAC signature verification | Required | Every webhook must be verified |
| Idempotency key tracking | Required | Prevents duplicate invoices |
| Environment variables for secrets | Required | Never hardcode secrets |
| HTTPS (automatic on Uberspace) | Required | Let's Encrypt included |

### Code Checklist

```javascript
// 1. HMAC verification on every webhook
app.post('/webhooks/shopify', (req, res) => {
  const signature = req.headers['x-shopify-hmac-sha256'];
  if (!verifyShopifyWebhook(req.body, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }
  // ... process webhook
});

// 2. Idempotency check before processing
const existing = await db.webhooks.findOne({ id: webhookId });
if (existing) {
  return res.status(200).send('Already processed');
}

// 3. Respond within 5 seconds
app.post('/webhooks/shopify', async (req, res) => {
  // Verify signature first
  // Then immediately return 200
  res.status(200).send('OK');
  // Process asynchronously (don't await)
  processWebhook(req.body);
});
```

### Sevdesk System Version Detection

```javascript
// Add to sevdesk.js
async function detectSystemVersion() {
  const result = await sevdeskRequest('/CheckAccount');
  // Store version for subsequent calls
  return result.systemVersion; // 'v1' or 'v2'
}

// Adjust tax handling based on version
function getTaxConfig(systemVersion, taxRate) {
  if (systemVersion === 'v2') {
    return { taxRule: mapTaxRateToRule(taxRate) };
  }
  return { taxType: 'default', taxRate };
}
```

---

## Part 9: Ongoing Maintenance

### Updating the Application

```bash
# SSH into Uberspace
ssh username@username.uber.space

# Navigate to app directory
cd ~/sevdesk-sync

# Pull latest changes
git pull

# Install any new dependencies
npm install

# Restart the service
supervisorctl restart sevdesk-sync
```

### Monitoring

```bash
# Check service status
supervisorctl status

# View recent logs
tail -100 ~/sevdesk-sync/logs/stdout.log

# Check for errors
grep -i error ~/sevdesk-sync/logs/stderr.log
```

### Database Backups

Uberspace includes daily and weekly backups automatically. To manually backup:

```bash
# PostgreSQL backup
pg_dump sevdesk > ~/backups/sevdesk-$(date +%Y%m%d).sql
```

---

## Next Steps

After basic implementation:

1. Add error handling and retry logic
2. Implement Sevdesk webhook for reverse sync
3. Add logging and monitoring
4. Handle edge cases (refunds, partial payments)

---

## Related Documents

- [Decision: Custom App](decision-custom-app.md) - Why we chose this approach
- [Shopify API Research](shopify-api-research.md) - Detailed API reference
- [Sevdesk API Research](sevdesk-api-research.md) - Detailed API reference
