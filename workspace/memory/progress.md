# Progress: Task Tracking

## Completed
- [2026-02-17] Project initialized with OpenCode infrastructure
- [2026-02-17] API Research - Shopify API capabilities documented
- [2026-02-17] API Research - Sevdesk API capabilities documented
- [2026-02-17] API Research - Integration patterns analyzed
- [2026-02-17] API Research - Tech stack recommendations finalized
- [2026-02-17] Research synthesis document created
- [2026-02-17] Integration options evaluated (existing app vs custom)
- [2026-02-17] Decision: Build custom Shopify app for bidirectional sync
- [2026-02-17] Risk assessment completed (Shopify, Sevdesk, hosting, security)
- [2026-02-17] Hosting decision: Uberspace (EUR 6-9/month, no cold starts)
- [2026-02-17] Implementation guide created for Uberspace deployment
- [2026-02-17] Technical specification written (A1-tech-spec.md)
- [2026-02-17] Phase 1 implementation plan created (A2-phase1-plan.md)
- [2026-02-17] Key architectural decisions finalized in decision log
- [2026-02-17] Architecture diagrams created with Mermaid (Creative Tech standards)
- [2026-02-17] System overview diagram integrated into comprehensive synthesis
- [2026-02-17] CRITICAL: Corrected primary flow to Sevdesk → Shopify (not reverse)
- [2026-02-17] Added payment overdue notification feature
- [2026-02-17] Added customer email sending to payment flow
- [2026-02-17] Updated database schema with notification_history table
- [2026-02-20] Moved spec/plan files to AlignFirst folder structure
- [2026-02-20] Created A0-prerequisites.md (manual setup checklist)
- [2026-02-20] Split A2-plan into A2, A3, A4 (smaller focused plans)
- [2026-02-20] Changed from webhook-based to polling-based (works locally)
- [2026-02-20] A2-plan COMPLETE: Project foundation (17 files, 11 acceptance criteria)
- [2026-02-20] A3-plan COMPLETE: Shopify integration (order lookup, status update, email)
- [2026-02-20] A4-plan COMPLETE: Testing (87.83% coverage, 28 tests) and documentation

## In Progress
None - Implementation complete

## Next
- Configure production environment (.env with credentials)
- Create PostgreSQL database `sevdesk_sync`
- Deploy to Uberspace (follow docs/deployment-guide.md)
- Set up monitoring and alerting

## Blocked
None

---

**Last Updated**: 2026-02-21 10:30:00

## Recent Changes
- [2026-02-21] Fixed Shopify OAuth URL format (use .myshopify.com domain)
- [2026-02-21] Changed invoice filtering from invoiceDateFrom to update time filter
  - Now filters by `invoice.update` field (when invoice was last modified)
  - Correctly catches invoices that were created earlier but paid recently
  - All 28 tests passing
