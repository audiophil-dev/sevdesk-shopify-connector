# Simple Integration Options: Shopify to Sevdesk

**Agent**: @technology-researcher
**Date**: 2026-02-17
**Research Question**: What are the simplest options to sync Shopify orders to Sevdesk for a small shop (few orders per week)?
**Depth**: Moderate

## Executive Summary

For a small Shopify shop with only a few orders per week, the **simplest and most cost-effective solution is the existing "sevdesk Buchhaltung 2026+" app** from the Shopify App Store. This app provides direct Shopify-to-Sevdesk synchronization without requiring any custom development or third-party automation tools.

Key finding: Shopify Flow cannot make HTTP requests on Basic plans (requires Grow or higher), Zapier has no Sevdesk integration, but there is an existing dedicated app that handles this exact use case.

## Key Findings

### 1. Shopify Flow Limitations

Shopify Flow is available on Basic, Grow, Advanced, and Plus plans as a free app. However, the critical **"Send HTTP Request" action is only available on Grow, Advanced, and Plus plans** [1][2].

**Key limitations**:
- Basic plan stores cannot send HTTP requests to external APIs like Sevdesk
- Flow has a 30-second timeout for HTTP responses
- API rate limits apply based on plan tier

**Evidence**:
- Shopify Help Center explicitly states: "This action is only available to the Shopify Plus, Advanced, or Grow plans" for Send HTTP Request [1]
- Flow is available on Basic, Grow, Advanced, and Plus plans, but HTTP actions require higher tiers [2]

### 2. No-Code Integration Platforms

#### Zapier

**Status**: No direct Sevdesk integration available [3].

Zapier has not built a Sevdesk integration, and Sevdesk has not built a Zapier integration. This means direct Shopify-to-Sevdesk zaps are not possible without custom webhook handling.

**Pricing for low volume**:
- Free plan: 100 tasks/month
- Starter: $19.99/month (2,000 tasks)
- Professional: $49.99/month (10,000 tasks)

#### Make (Integromat)

**Status**: Third-party Sevdesk integration exists via Makeitfuture [4].

Make has a community-built integration for Sevdesk that can connect to Shopify. However, this is not a native integration and may require more setup.

**Pricing**:
- Free: 1,000 operations/month
- Core: $9/month
- Pro: $29/month

#### Integrately

**Status**: HAS native Shopify + Sevdesk integration [5].

This is a viable option with a direct integration already built.

**Pricing**:
- Free: 100 tasks/month, 5 automations
- Starter: $19.99/month (2,000 tasks)
- Professional: $39/month (10,000 tasks)

#### n8n

**Status**: Self-hosted option available, free Community Edition [6].

n8n offers a self-hosted option that is completely free (Community Edition) with unlimited executions. This requires technical setup but has no monthly cost.

**Pricing**:
- Cloud: Starts at EUR 24/month (2,500 executions)
- Self-hosted: Free (Community Edition)
- Setup required: Docker or Node.js hosting

### 3. Simple Node.js App Approach

For a custom minimal integration, a small Node.js app can be hosted cheaply:

#### Hosting Options

| Platform | Free Tier | Paid Tier | Notes |
|----------|-----------|-----------|-------|
| **Railway** | $5 credits/month | $5/month | Pay-as-you-go after credits |
| **Render** | Yes (with limits) | $7/month | Free for small apps |
| **Fly.io** | 3 shared-CPU VMs | $5.74/month | Edge-optimized |

#### Minimum Viable Architecture

For a few orders per week, the architecture would be:

1. Shopify Webhook -> Your Node.js app (hosted on Railway/Render)
2. Node.js app -> Sevdesk API (create invoice)
3. Cost: $0-7/month depending on platform

This approach requires:
- Writing a small webhook handler (Express.js)
- Hosting on a platform (Railway recommended)
- Sevdesk API key

### 4. Existing Shopify App Solution

**App**: sevdesk Buchhaltung 2026+ [7]

This is a dedicated Shopify app that does exactly what is needed:

**Features**:
- Automatic synchronization of order data
- Creates invoices and credit notes
- Syncs payment and tax data
- Supports refunds and credit notes
- Multi-shop support
- DATEV export ready

**Pricing**:
- Free to install
- Standard: $13/month (EUR 10/month)
- Premium: $26/month (EUR 20/month)
- Free trial available

**Rating**: 4.4/5 (80 reviews)

**Evidence**: The app description states "Synchronisation of order data, Automatic creation and sending of invoices and credit notes, Automatic creation and sending of refunds" [7].

## Analysis

### Comparison Matrix

| Option | Complexity | Cost | Setup Time | Reliability |
|--------|------------|------|------------|-------------|
| **Shopify App (sevdesk Buchhaltung)** | Low | $13-26/month | 10 minutes | High (native) |
| **Integrately** | Medium | Free-20/month | 30 minutes | High |
| **Custom Node.js app** | High | $5-7/month | 2-4 hours | Medium |
| **n8n self-hosted** | High | Free | 4-8 hours | Medium |
| **Make (Integromat)** | Medium | $9+/month | 1 hour | Medium |

### Constraints Analysis

- **Shopify Basic plan**: Cannot use HTTP requests in Flow (requires Grow+)
- **Low volume**: Few orders per week means most platforms have generous free tiers
- **Cost-conscious**: Self-hosted options are free but require technical effort
- **Simplicity preferred**: Existing app requires no coding

## Final Decision: Custom Shopify App

After evaluating all options, the decision was made to build a **custom Shopify app** rather than using the existing sevdesk app.

### Why Not the sevdesk Shopify App

The existing sevdesk app ($13/month) provides excellent one-way sync but has a critical limitation:

| Feature | sevdesk App | Custom App |
|---------|-------------|------------|
| Shopify -> Sevdesk sync | Yes | Yes |
| Sevdesk -> Shopify sync | No | Yes |
| Cost | $13/month | $5/month |
| Customization | Limited | Full control |

**The dealbreaker**: When a customer pays via bank transfer and payment is recorded in Sevdesk, the Shopify order status is not automatically updated. This requires manual work for each offline payment.

### Why Custom App

| Factor | Assessment |
|--------|------------|
| Bidirectional sync | Required - custom app provides this |
| Cost | $5/month (Railway) vs $13/month (sevdesk app) |
| Development effort | 12-20 hours one-time |
| Maintenance | Low - simple codebase |
| Control | Full control over behavior |

### Implementation

See [Custom App Implementation Guide](custom-app-implementation.md) for step-by-step instructions.

### Decision Document

See [Decision: Custom App](decision-custom-app.md) for full rationale and consequences.

---

## Original Analysis (Preserved for Reference)

### Primary Recommendation (Original)

**Use the sevdesk Buchhaltung 2026+ Shopify app** [7].

**Rationale**:
- Simplest option - no coding, no third-party tools
- Direct integration built for exactly this use case
- Free trial available to test
- $13/month is reasonable for automation that saves manual work
- 4.4 rating indicates reliable performance
- Handles invoices, payments, tax data automatically

**Note**: This recommendation was superseded by the need for bidirectional sync.

### Alternative Recommendations (Original)

For users who want lower cost or more control:

1. **Integrately** (if budget is critical): Free plan has 100 tasks/month, which covers a few orders per week. Native Shopify + Sevdesk integration exists.

2. **Custom Node.js on Railway** (if want full control): $5/month, completely customizable. Requires development time but gives full control.

3. **n8n self-hosted** (if technical and want free): Completely free but requires Docker setup and maintenance.

## Risks and Considerations

- **App lock-in**: The Shopify app is specific to Sevdesk - if you switch accounting software, you'd need a new solution
- **API rate limits**: With many automation tools, be aware of task/execution limits
- **Complexity tradeoff**: Free options (n8n, custom app) require technical skill to set up and maintain
- **Pricing changes**: Verify current pricing before committing - all prices cited from 2026 sources

## Conclusion

For a small shop with few orders per week wanting simple Shopify-to-Sevdesk integration, the existing **sevdesk Buchhaltung 2026+ app** is the recommended solution. It provides the lowest complexity, reliable automation, and costs only $13/month (Standard plan). This eliminates the need for custom development or managing third-party automation tools.

---

## Sources

### Primary Sources ([4/5]-[5/5])

- [1] [Send HTTP request - Shopify Help Center](https://help.shopify.com/en/manual/shopify-flow/reference/actions/send-http-request) - [5/5] - Accessed 2026-02-17
- [2] [Shopify Flow - Shopify Help Center](https://help.shopify.com/en/manual/shopify-flow) - [5/5] - Accessed 2026-02-17
- [7] [sevdesk Buchhaltung 2026+ - Shopify App Store](https://apps.shopify.com/sevdesk-integration) - [5/5] - Accessed 2026-02-17

### Supporting Sources ([3/5])

- [3] [sevDesk Integrations - Zapier](https://zapier.com/apps/sevdesk/integrations) - [4/5] - Accessed 2026-02-17
- [4] [sevDesk Make.com Integromat Integration](https://www.makemarket.io/apps/sevDesk-zapier-make-com) - [3/5] - Accessed 2026-02-17
- [5] [sevDesk + Shopify Integration - Integrately](https://integrately.com/integrations/sevdesk/shopify) - [4/5] - Accessed 2026-02-17
- [6] [n8n Cloud Pricing 2026](https://connectsafely.ai/articles/n8n-cloud-pricing-guide) - [4/5] - Accessed 2026-02-17

### Additional References

- [Railway Pricing](https://railway.com/pricing) - [4/5] - Accessed 2026-02-17
- [Integrately Pricing](https://integrately.com/pricing) - [4/5] - Accessed 2026-02-17

---

**Research completed**: 2026-02-17
**Time spent**: 30 minutes
