# Shopify-Sevdesk Payment Notifier

Automatically sends payment confirmation emails to customers when payments are recorded in Sevdesk.

## Features

- Polls Sevdesk for paid invoices
- Updates Shopify order status to "paid"
- Sends customer email notifications via Shopify
- Prevents duplicate notifications (idempotency)
- Tracks notification history in PostgreSQL

## Quick Start

1. Complete prerequisites (see `docs/setup-guide.md`)
2. Install dependencies: `npm install`
3. Configure environment: `cp .env.example .env`
4. Run migrations: `npm run migrate`
5. Start server: `npm run dev`

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `SHOPIFY_SHOP` | Your Shopify store URL (e.g., myshop) | Yes |
| `SHOPIFY_CLIENT_ID` | Shopify Admin API client ID | Yes |
| `SHOPIFY_CLIENT_SECRET` | Shopify Admin API client secret | Yes |
| `SEVDESK_API_KEY` | Sevdesk API key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PORT` | Server port (default: 3000) | No |
| `POLL_INTERVAL_MS` | Polling interval in ms (default: 60000) | No |
| `ENABLE_POLLING` | Enable polling (true/false) | No |

## Development

- `npm run dev` - Start development server
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run build` - Build for production
- `npm run migrate` - Run database migrations

## Architecture

```
Polling Job (every 60 seconds)
  -> Query Sevdesk for paid invoices
  -> Check idempotency (prevent duplicates)
  -> Find Shopify order by customer email
  -> Update order status to "paid"
  -> Record notification in database
```

## Testing

The project includes comprehensive tests:

- Unit tests for all core modules (87%+ coverage)
- Integration tests for the payment flow
- Error handling tests for API failures

Run tests:
```bash
npm test           # Run all tests
npm run test:coverage  # Run with coverage report
```

## Documentation

- [Setup Guide](docs/setup-guide.md) - Step-by-step setup instructions
- [Deployment Guide](docs/deployment-guide.md) - Production deployment

## License

MIT
