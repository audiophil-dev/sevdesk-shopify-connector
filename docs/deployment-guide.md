# Deployment Guide

This guide covers deploying the Shopify-Sevdesk Payment Notifier to Uberspace.

## Prerequisites

- Uberspace account (EUR 6-9/month)
- Domain pointing to Uberspace
- PostgreSQL database on Uberspace

## Step 1: Prepare Uberspace

1. Create Uberspace account
2. Note your domain and SSH credentials

## Step 2: Set Up Database

```bash
# SSH into Uberspace
ssh yourusername@yourdomain.uberspace.de

# Create PostgreSQL database
isql -v
CREATE DATABASE sevdesk_sync;
\q
```

Or use the Uberspace control panel to create the database.

## Step 3: Deploy Application

```bash
# SSH into Uberspace
ssh yourusername@yourdomain.uberspace.de

# Navigate to web root
cd /var/www/sevdesk-shopify-connector

# Clone or update repository
git clone <repository-url> .

# Install production dependencies
npm install --production

# Create .env file
nano .env
```

## Step 4: Configure Environment Variables

In `.env`:

```bash
SHOPIFY_SHOP=your-shop-name
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret
SEVDESK_API_KEY=your_sevdesk_api_key
DATABASE_URL=postgresql://username:password@localhost/sevdesk_sync
PORT=3000
POLL_INTERVAL_MS=60000
ENABLE_POLLING=true
```

## Step 5: Run Migrations

```bash
npm run migrate
```

## Step 6: Configure supervisord

Create `/home/username/etc/sevdesk-notifier.conf`:

```ini
[program:sevdesk-notifier]
command=node /var/www/sevdesk-shopify-connector/dist/index.js
directory=/var/www/sevdesk-shopify-connector
user=yourusername
autostart=true
autorestart=true
stderr_logfile=/var/log/sevdesk-notifier.err.log
stdout_logfile=/var/log/sevdesk-notifier.out.log
environment=NODE_ENV="production"
```

Enable and start:

```bash
supervisorctl reread
supervisorctl update
supervisorctl start sevdesk-notifier
```

## Step 7: Configure Web Server

Create `.htaccess` for Apache:

```apache
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

Or use Uberspace's nginx config.

## Step 8: Set Up SSL

Uberspace provides Let's Encrypt:

```bash
uberspace-letsencrypt
```

## Monitoring

### Logs

```bash
# View application logs
tail -f /var/log/sevdesk-notifier.out.log
tail -f /var/log/sevdesk-notifier.err.log

# Or via supervisorctl
supervisorctl tail sevdesk-notifier
```

### Health Check

```bash
curl https://yourdomain.uberspace.de/health
```

## Troubleshooting

### Service Won't Start

- Check logs: `supervisorctl tail sevdesk-notifier`
- Verify .env exists and has correct values
- Check database connection

### SSL Issues

- Re-run: `uberspace-letsencrypt`

### Database Connection Issues

- Verify DATABASE_URL is correct
- Check PostgreSQL is running: `systemctl status postgresql`

## Updates

To update the application:

```bash
cd /var/www/sevdesk-shopify-connector
git pull
npm install --production
npm run migrate
supervisorctl restart sevdesk-notifier
```
