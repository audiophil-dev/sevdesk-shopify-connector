# Shopify-Sevdesk Payment Notifier

Automatically sends payment confirmation emails to customers when payments are recorded in Sevdesk.

## Features

- Polls Sevdesk for paid invoices at configurable intervals
- Updates Shopify order status to "paid"
- Sends customer email notifications via Shopify
- Prevents duplicate notifications through idempotency checks
- Tracks notification history in PostgreSQL for audit trails
- Handles API rate limiting with exponential backoff

## Quick Start

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- Shopify Admin API access
- Sevdesk API key

### Installation

1. Complete prerequisites setup (see `docs/setup-guide.md`)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment:
   ```bash
   cp .env.example .env
   ```
4. Run database migrations:
   ```bash
   npm run migrate
   ```
5. Start the server:
   ```bash
   npm run dev
   ```

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

## Architecture

```
Polling Job (every 60 seconds)
  -> Query Sevdesk for paid invoices
  -> Check idempotency (prevent duplicates)
  -> Find Shopify order by customer email
  -> Update order status to "paid"
  -> Record notification in database
```

For detailed architecture documentation, see `docs/architecture.md`.

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm test` | Run all tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run build` | Build for production |
| `npm run migrate` | Run database migrations |

### Testing

The project includes comprehensive tests:

- Unit tests for all core modules (87%+ coverage)
- Integration tests for the payment flow
- Error handling tests for API failures

Run tests:
```bash
npm test              # Run all tests
npm run test:coverage # Run with coverage report
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design and component interactions |
| [API Reference](docs/api-reference.md) | Sevdesk and Shopify API endpoints |
| [Configuration Guide](docs/configuration-guide.md) | Environment setup and configuration |
| [Best Practices](docs/best-practices.md) | Development and deployment guidelines |
| [Setup Guide](docs/setup-guide.md) | Step-by-step setup instructions |
| [Deployment Guide](docs/deployment-guide.md) | Production deployment instructions |

## License

MIT