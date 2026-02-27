# Transfer Prompt: Shopify Order Import Implementation

**From**: @research-coordinator
**To**: @planning-collaborator
**Date**: 2026-02-27
**Research Document**: `workspace/docs/knowledge/integrations/shopify-order-import.md`

---

## Context

The user has a CSV file containing orders from their production Shopify shop and wants to import these orders into their development shop via the Shopify Admin GraphQL API.

## Research Summary

### Key Findings

1. **Two API methods available**:
   - Individual `orderCreate` mutations (rate-limited to 5 orders/minute on dev stores)
   - Bulk Operations with JSONL (recommended for 50+ orders)

2. **Critical prerequisites**:
   - Products/variants must exist in dev shop before importing orders
   - Need to build SKU → Shopify GID lookup map
   - Customer data uses "upsert" pattern (create or update by email)

3. **Important limitations**:
   - Only ONE discount code per order via API
   - Automatic discounts cannot be applied - must replicate manually
   - Gift card orders cannot be created via API

### Recommended Approach

Based on dev store rate limits, use **Bulk Operations** for any significant import:

1. Export products from production → Import to dev shop
2. Parse CSV and transform to JSONL format
3. Upload via staged upload API
4. Execute bulk mutation
5. Poll for completion and validate results

---

## Implementation Planning Considerations

### Architecture Questions

1. **Is this a one-time import or recurring feature?**
   - One-time: Simple script, manual execution
   - Recurring: Needs scheduling, incremental sync, conflict resolution

2. **Where does the CSV file live?**
   - Manual upload to app?
   - Scheduled export from production shop?
   - File system path?

3. **How should products be handled?**
   - Automatic product sync before order import?
   - Manual product import first?
   - What happens if product variant doesn't exist?

### Technical Decisions Needed

1. **Import method selection**:
   - Auto-detect based on order count (50+ = bulk)?
   - Always use bulk for safety?
   - User-configurable?

2. **Error handling strategy**:
   - Fail fast on first error?
   - Continue and log failures?
   - Retry logic for rate limits?

3. **Progress tracking**:
   - CLI progress bar?
   - Web UI with status updates?
   - Database state tracking?

4. **Validation approach**:
   - Compare order totals pre/post import?
   - Spot-check sampling?
   - Full reconciliation report?

### Suggested Implementation Phases

**Phase 1: Core Import Script**
- CSV parser with field validation
- Variant lookup service
- JSONL generator for bulk operations
- Bulk operation executor

**Phase 2: Error Handling & Logging**
- Parse error handling
- Validation error logging
- Retry logic for transient failures
- Progress reporting

**Phase 3: Product Sync (Optional)**
- Export products from source shop
- Import to target shop
- SKU mapping persistence

**Phase 4: UI/UX (Optional)**
- File upload interface
- Progress dashboard
- Error review and retry

---

## Key Files to Review

| File | Purpose |
|------|---------|
| `workspace/docs/knowledge/integrations/shopify-order-import.md` | Complete API documentation and examples |
| `workspace/memory/core/project.md` | Project architecture context |
| Existing Shopify integration code | Current patterns to follow |

---

## Questions for User

Before detailed planning, clarify with user:

1. Is this a one-time migration or recurring sync?
2. Where is the CSV file located / how will it be provided?
3. Do products already exist in the dev shop, or need sync?
4. What level of error handling is needed?
5. Is a UI needed, or CLI script sufficient?

---

## Expected Deliverables

1. **Specification**: `plans/shopify-import/A1-spec.md`
   - Requirements and acceptance criteria
   - Technical approach
   - Data flow diagrams

2. **Implementation Plan**: `plans/shopify-import/A2-plan.md`
   - Phase breakdown
   - Agent assignments
   - Validation checkpoints

---

## Usage

Copy this prompt to start planning:

```
@planning-collaborator

I need to plan the implementation of a Shopify order import feature.

## Context
User has a CSV with orders from their production shop and wants to import them to their dev shop via API.

## Research Already Done
See: workspace/docs/knowledge/integrations/shopify-order-import.md

This document covers:
- Shopify orderCreate mutation API
- Bulk Operations workflow
- CSV field mappings
- Critical limitations

## Your Task
1. Read the research document
2. Ask clarifying questions (see "Questions for User" section)
3. Create a specification and implementation plan

## Constraints
- Dev store rate limit: 5 orders/minute (use bulk operations)
- Products must exist in target shop before orders
- Follow existing project patterns
```
