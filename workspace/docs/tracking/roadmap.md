# Roadmap

## Current Sprint (2026-02-27)

### In Progress
| Feature | Status | Agent | Notes |
|---------|--------|-------|-------|
| Shopify Order Import | Orchestrating | @workflow-orchestrator | 9000+ orders via Bulk Operations API |

### Planned Features

#### P1 - High Priority

| Feature | Description | Est. Time | Dependencies |
|---------|-------------|-----------|--------------|
| Retry Mechanisms | Exponential backoff for failed API calls | 4h | None |
| Structured Logging | Winston/Pino with JSON format, correlation IDs | 3h | None |
| Monitoring Dashboard | Sentry integration + basic metrics | 4h | Structured logging |

#### P2 - Medium Priority

| Feature | Description | Est. Time | Dependencies |
|---------|-------------|-----------|--------------|
| Webhook Integration | Accept Shopify `orders/paid` webhooks | 6h | Retry mechanisms |
| Message Queue | BullMQ + Redis for async processing | 8h | Webhook integration |
| Circuit Breaker | Protect Sevdesk API from overload | 3h | Message queue |

#### P3 - Future Consideration

| Feature | Description | Est. Time | Dependencies |
|---------|-------------|-----------|--------------|
| Additional Channels | SMS/Slack notifications | 6h | Webhook integration |
| Multi-store Support | Handle multiple Shopify stores | 12h | Message queue |
| Admin Dashboard | Web UI for monitoring sync status | 16h | Monitoring dashboard |

## Completed Features

| Feature | Completion Date | Coverage |
|---------|-----------------|----------|
| Project Foundation | 2026-02-22 | 87.83% |
| Shopify Integration | 2026-02-22 | 28/28 tests |
| Email Notifications | 2026-02-22 | All acceptance criteria |
| Documentation | 2026-02-22 | README, setup guide, deployment guide |
