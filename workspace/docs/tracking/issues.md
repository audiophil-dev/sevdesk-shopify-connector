# Issues & Bugs

## Active Issues

**None identified**

All tests passing (28/28), no TODO/FIXME/BUG markers in source code.

## Resolved Issues

| Date | Issue | Resolution |
|------|-------|------------|
| 2026-02-22 | Invoice filtering used creation date | Fixed to use update time |
| 2026-02-22 | Shopify OAuth URL format | Handles both admin.shopify.com and myshopify.com |

## Potential Issues (Monitor)

| Area | Concern | Mitigation |
|------|---------|------------|
| Rate limiting | Shopify API 5 orders/min limit | Bulk Operations API (order import) |
| Webhook reliability | Shopify webhooks not guaranteed | Polling fallback every 5-10 min |
| Email delivery | External service dependency | Use reliable provider (SendGrid/Mailgun) |
| Cold starts | Uberspace has no cold starts | N/A (Railway issue resolved) |
