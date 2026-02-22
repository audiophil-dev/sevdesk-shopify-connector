# Deployment Guide

This guide covers deploying the Shopify-Sevdesk Payment Notifier to production.

## Prerequisites

- Uberspace account (EUR 6-9/month) or equivalent hosting
- Domain pointing to your server
- PostgreSQL database (version 14+)
- SSL certificate (Let's Encrypt recommended)

## Step 1: Prepare Server

1. Create hosting account (Uberspace recommended for cost-effectiveness)
2. Note your domain and SSH credentials
3. Ensure Node.js 18+ is available

## Step 2: Set Up Database

```bash
# SSH into server
ssh yourusername@yourdomain.uberspace.de

# Create PostgreSQL database
createdb sevdesk_sync

# Verify connection
psql -d sevdesk_sync -c "SELECT version();"
```

Alternatively, use the hosting control panel to create the database.

## Step 3: Deploy Application

```bash
# SSH into server
ssh yourusername@yourdomain.uberspace.de

# Navigate to web root
cd /var/www/virtual/$USER/

# Clone repository
git clone <repository-url> sevdesk-shopify-connector
cd sevdesk-shopify-connector

# Install production dependencies
npm ci --production

# Build application
npm run build

# Create .env file
nano .env
```

## Step 4: Configure Environment Variables

Create `.env` file with the following variables:

```bash
# Required - Shopify Configuration
SHOPIFY_SHOP=your-shop-name
SHOPIFY_CLIENT_ID=your_client_id
SHOPIFY_CLIENT_SECRET=your_client_secret

# Required - Sevdesk Configuration
SEVDESK_API_KEY=your_sevdesk_api_key

# Required - Database
DATABASE_URL=postgresql://username:password@localhost/sevdesk_sync

# Optional - Server Configuration
PORT=3000
NODE_ENV=production
POLL_INTERVAL_MS=60000
ENABLE_POLLING=true
```

## Step 5: Run Migrations

```bash
npm run migrate
```

Verify tables were created:

```bash
psql -d sevdesk_sync -c "\dt"
```

## Step 6: Configure Process Manager

### Using supervisord (Uberspace)

Create `/home/$USER/etc/services.d/sevdesk-notifier.ini`:

```ini
[program:sevdesk-notifier]
command=node /var/www/virtual/%(ENV_USER)s/sevdesk-shopify-connector/dist/index.js
directory=/var/www/virtual/%(ENV_USER)s/sevdesk-shopify-connector
user=%(ENV_USER)s
autostart=true
autorestart=true
startsecs=5
stopwaitsecs=10
stderr_logfile=/var/www/virtual/%(ENV_USER)s/logs/sevdesk-notifier.err.log
stdout_logfile=/var/www/virtual/%(ENV_USER)s/logs/sevdesk-notifier.out.log
environment=NODE_ENV="production"
```

Create logs directory:

```bash
mkdir -p /var/www/virtual/$USER/logs
```

Enable and start:

```bash
supervisorctl reread
supervisorctl update
supervisorctl start sevdesk-notifier
```

### Using systemd (Other Hosting)

Create `/etc/systemd/system/sevdesk-notifier.service`:

```ini
[Unit]
Description=Shopify-Sevdesk Payment Notifier
After=network.target postgresql.service

[Service]
Type=simple
User=appuser
WorkingDirectory=/var/www/sevdesk-shopify-connector
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/var/www/sevdesk-shopify-connector/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
systemctl daemon-reload
systemctl enable sevdesk-notifier
systemctl start sevdesk-notifier
```

## Step 7: Configure Web Server

### Apache (.htaccess)

Create `.htaccess` in document root:

```apache
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

### Nginx

Add to server configuration:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

## Step 8: Set Up SSL

### Uberspace (Let's Encrypt)

```bash
uberspace-letsencrypt
uberspace-letsencrypt-certs -d yourdomain.uberspace.de
```

### Other Hosting

Use certbot:

```bash
sudo certbot --nginx -d yourdomain.com
```

## Security Hardening

### File Permissions

```bash
# Secure .env file
chmod 600 .env

# Secure logs directory
chmod 700 /var/www/virtual/$USER/logs
```

### Firewall Rules

Only allow necessary ports:
- Port 80 (HTTP) - redirect to HTTPS
- Port 443 (HTTPS) - web traffic
- Port 22 (SSH) - administration

### API Key Security

- Never commit API keys to version control
- Rotate keys every 90 days
- Use minimal required permissions for each API token
- Monitor API usage for anomalies

## Monitoring

### Log Management

```bash
# View application logs
tail -f /var/www/virtual/$USER/logs/sevdesk-notifier.out.log
tail -f /var/www/virtual/$USER/logs/sevdesk-notifier.err.log

# Or via supervisorctl
supervisorctl tail sevdesk-notifier
supervisorctl tail sevdesk-notifier stderr
```

### Health Check

```bash
# Check application health
curl https://yourdomain.uberspace.de/health

# Expected response
{"status":"ok","timestamp":"2024-01-15T10:30:00Z"}
```

### Database Monitoring

```bash
# Check connection count
psql -d sevdesk_sync -c "SELECT count(*) FROM pg_stat_activity;"

# Check table sizes
psql -d sevdesk_sync -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;"
```

## Backup Procedures

### Database Backup

```bash
# Create backup
pg_dump sevdesk_sync > backup_$(date +%Y%m%d).sql

# Restore from backup
psql sevdesk_sync < backup_20240115.sql
```

### Automated Daily Backups

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * pg_dump sevdesk_sync > /var/www/virtual/$USER/backups/sevdesk_sync_$(date +\%Y\%m\%d).sql
```

### Backup Retention

Keep backups for:
- Daily: 7 days
- Weekly: 4 weeks
- Monthly: 12 months

## Performance Tuning

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_notifications_invoice_id ON notifications(invoice_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_status ON notifications(status);
```

### Connection Pooling

Ensure DATABASE_URL includes pooling parameters:

```bash
DATABASE_URL=postgresql://user:pass@localhost/sevdesk_sync?pool_max=10&pool_min=2
```

### Resource Limits

Monitor and adjust:
- Memory: Node.js heap size (default: ~1.4GB)
- CPU: Polling interval based on load
- Connections: Database connection pool size

## Troubleshooting

### Service Won't Start

1. Check logs: `supervisorctl tail sevdesk-notifier`
2. Verify .env exists with correct permissions: `ls -la .env`
3. Test database connection: `psql $DATABASE_URL`
4. Check Node.js version: `node --version`

### SSL Issues

1. Re-run certificate issuance: `uberspace-letsencrypt`
2. Verify certificate: `openssl s_client -connect yourdomain.uberspace.de:443`

### Database Connection Issues

1. Verify DATABASE_URL is correct
2. Check PostgreSQL status: `systemctl status postgresql`
3. Test connection: `psql -d sevdesk_sync -c "SELECT 1;"`
4. Check connection limits: `psql -c "SELECT count(*) FROM pg_stat_activity;"`

### High Memory Usage

1. Check Node.js memory: `node --expose-gc --max-old-space-size=512 dist/index.js`
2. Review database connection pool size
3. Check for memory leaks in logs

## Updates

### Standard Update Procedure

```bash
# Navigate to application directory
cd /var/www/virtual/$USER/sevdesk-shopify-connector

# Pull latest changes
git pull origin main

# Install/update dependencies
npm ci --production

# Run any new migrations
npm run migrate

# Restart service
supervisorctl restart sevdesk-notifier

# Verify health
curl https://yourdomain.uberspace.de/health
```

### Rollback Procedure

```bash
# Stop service
supervisorctl stop sevdesk-notifier

# Restore previous version
git checkout <previous-commit-hash>

# Restore database if needed
psql sevdesk_sync < backup_20240115.sql

# Restart service
supervisorctl start sevdesk-notifier
```

## Maintenance Schedule

| Task | Frequency | Command |
|------|-----------|---------|
| Log rotation | Weekly | Automatic via logrotate |
| Database backup | Daily | crontab pg_dump |
| Security updates | Monthly | npm audit fix |
| API key rotation | Quarterly | Update .env, restart |
| SSL renewal | Automatic | Let's Encrypt auto-renewal |