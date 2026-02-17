# Product Context: sevdesk-shopify-connector

## Project Overview
Integration connector that synchronizes Shopify store data with Sevdesk accounting system and automatically sends payment confirmation emails.

### What This Is
- Project type: Integration connector / automation service
- Primary purpose: Automatically synchronize Shopify orders and payments with Sevdesk, send payment confirmation emails via Shopify
- Target users: E-commerce store owners using both Shopify and Sevdesk

### Key Feature
When a payment is received in Shopify, automatically send a confirmation email to the customer via Shopify's email system.

### Technology Stack
- **Languages**: Node.js/JavaScript (to be confirmed during research)
- **APIs**: Shopify API (REST/GraphQL), Sevdesk API
- **Infrastructure**: TBD (to be determined during research)
- **Build Tools**: TBD

### Repository Structure
```
sevdesk-shopify-connector/
├── src/                    # Source code
├── tests/                  # Test files
├── docs/
│   ├── global/            # Symlink to OpenCode shared docs
│   ├── knowledge/         # Stable reference (research, market, business)
│   ├── planning/          # Active plans and architecture docs
│   └── tracking/          # Progress tracking (sprints, timeline)
├── workspace/memory/       # OpenCode agent context files
├── scripts/global/         # Symlink to OpenCode scripts
├── orchestration/          # Multi-session coordination artifacts
└── .worktrees/             # Isolated git worktrees for agents
```

## Success Metrics
- Payment synchronization latency (< 5 minutes from Shopify to Sevdesk)
- Email delivery reliability (> 99%)
- Code quality: 80%+ test coverage
- Zero data loss or duplication

## Integration Points
- **Shopify**: Order and payment data, customer email sending
- **Sevdesk**: Invoice and accounting data

---

**Last Updated**: 2026-02-17 18:12:37
