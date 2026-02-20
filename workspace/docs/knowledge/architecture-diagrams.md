# Architecture Diagrams: Shopify-Sevdesk Connector

Comprehensive visual architecture documentation for the Shopify-Sevdesk integration connector.

## System Overview

```mermaid
graph TD
    %% System Architecture Overview
    
    subgraph External ["External Services"]
        Shopify[Shopify Store API]
        Sevdesk[Sevdesk API]
    end
    style External fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Uberspace ["Uberspace Hosting"]
        WebhookEndpoint[Webhook Endpoint]
        PaymentMonitor[Payment Monitor Job]
        Database[(PostgreSQL)]
    end
    style Uberspace fill:#ffffff,stroke:#000000,stroke-width:2px
    
    Sevdesk -- "1. Payment Received" --> WebhookEndpoint
    WebhookEndpoint -- "2. Update Order" --> Shopify
    WebhookEndpoint -- "3. Send Email" --> Shopify
    WebhookEndpoint -- "4. Log State" --> Database
    PaymentMonitor -- "5. Check Overdue" --> Sevdesk
    PaymentMonitor -- "6. Send Reminder" --> Shopify
    PaymentMonitor -- "7. Log State" --> Database
    
    %% Classes
    class Shopify,Sevdesk software;
    class WebhookEndpoint,PaymentMonitor software;
    class Database files;
    
    %% Class Definitions
    classDef software fill:#ffffff,stroke:#ff6d00,stroke-width:3px,color:#000;
    classDef files fill:#ffffff,stroke:#19ffb5,stroke-width:3px,color:#000;
```

The diagram illustrates the core system flow of the **Shopify-Sevdesk Connector**:

- `Sevdesk API`: Triggers payment received events, provides invoice status
- `Webhook Endpoint`: Receives payment notifications, updates Shopify orders, sends emails (real-time)
- `Payment Monitor Job`: Daily check for overdue invoices, sends reminder emails
- `Shopify API`: Order updates, customer email sending
- `PostgreSQL`: Tracks sync state, notification history, prevents duplicates

---

## Phase 1: Payment Notification Flow

```mermaid
graph TD
    %% Detailed Payment Notification Flow
    
    subgraph Sevdesk ["Sevdesk"]
        PaymentReceived[Payment Received Event]
    end
    style Sevdesk fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph WebhookHandler ["Webhook Handler"]
        Receive[Receive POST]
        HMAC[HMAC Verification]
        Dedup[Deduplication Check]
        Parse[Parse Payment Data]
        State[Record Processing State]
    end
    style WebhookHandler fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph ShopifyIntegration ["Shopify Integration"]
        FindOrder[Find Shopify Order]
        UpdateStatus[Update Order Status]
        SendEmail[Send Payment Email]
    end
    style ShopifyIntegration fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Database ["Database"]
        SyncState[(sync_state table)]
    end
    style Database fill:#ffffff,stroke:#000000,stroke-width:2px
    
    PaymentReceived --> Receive
    Receive --> HMAC
    HMAC -- "Valid" --> Dedup
    HMAC -- "Invalid" --> Reject403[Return 403]
    Dedup -- "New" --> Parse
    Dedup -- "Duplicate" --> Return200[Return 200 OK]
    Parse --> State
    State --> FindOrder
    FindOrder --> UpdateStatus
    UpdateStatus --> SendEmail
    SendEmail --> SyncState
    SendEmail --> Success200[Return 200 OK]
    
    %% Error Paths
    Parse -- "Invalid" --> Return400[Return 400]
    FindOrder -- "Error" --> LogError[Log Error]
    UpdateStatus -- "Error" --> LogError
    SendEmail -- "Error" --> LogError
    LogError --> SyncState
    LogError --> Return202[Return 202 Accepted]
    
    %% Classes
    class PaymentReceived software;
    class Receive,HMAC,Dedup,Parse,State software;
    class FindOrder,UpdateStatus,SendEmail software;
    class SyncState files;
    class Reject403,Return200,Return400,Return202,Success200,LogError software;
    
    %% Class Definitions
    classDef software fill:#ffffff,stroke:#ff6d00,stroke-width:3px,color:#000;
    classDef files fill:#ffffff,stroke:#19ffb5,stroke-width:3px,color:#000;
```

The diagram illustrates the **Phase 1 Payment Notification Flow**:

- `HMAC Verification`: Validates webhook authenticity (prevents spoofing)
- `Deduplication Check`: Uses unique payment ID to prevent duplicate processing
- `Parse Payment Data`: Extracts invoice ID, amount, customer info
- `Find Shopify Order`: Matches Sevdesk invoice to Shopify order
- `Update Order Status`: Marks order as paid in Shopify
- `Send Payment Email`: Sends confirmation email to customer via Shopify

**Error Handling**:
- Invalid HMAC → 403 Forbidden (security event logged)
- Duplicate webhook → 200 OK (idempotency)
- Parse error → 400 Bad Request
- Shopify API error → 202 Accepted + logged for retry

---

## Payment Overdue Notification Flow

```mermaid
graph TD
    %% Payment Overdue Notification Flow
    
    subgraph CronJob ["Daily Overdue Check"]
        Start[Job Starts Daily]
        QuerySevdesk[Query Sevdesk for Overdue Invoices]
    end
    style CronJob fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Processing ["Overdue Processing"]
        Filter[Filter Unnotified Invoices]
        CheckDB[Check Notification History]
        SendReminder[Send Payment Reminder Email]
        LogNotification[Log Notification Sent]
    end
    style Processing fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph External ["External Services"]
        Sevdesk[Sevdesk API]
        Shopify[Shopify Email API]
    end
    style External fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Database ["Database"]
        NotificationHistory[(notification_history table)]
    end
    style Database fill:#ffffff,stroke:#000000,stroke-width:2px
    
    Start --> QuerySevdesk
    QuerySevdesk --> Sevdesk
    Sevdesk --> Filter
    Filter --> CheckDB
    CheckDB --> NotificationHistory
    CheckDB -- "Not Notified" --> SendReminder
    CheckDB -- "Already Notified" --> Skip[Skip Invoice]
    SendReminder --> Shopify
    Shopify --> LogNotification
    LogNotification --> NotificationHistory
    
    %% Classes
    class Start,QuerySevdesk software;
    class Filter,CheckDB,SendReminder,LogNotification,Skip software;
    class Sevdesk,Shopify software;
    class NotificationHistory files;
    
    %% Class Definitions
    classDef software fill:#ffffff,stroke:#ff6d00,stroke-width:3px,color:#000;
    classDef files fill:#ffffff,stroke:#19ffb5,stroke-width:3px,color:#000;
```

The diagram illustrates the **Payment Overdue Notification Flow**:

- `Daily Overdue Check`: Cron job runs once per day
- `Query Sevdesk`: Fetch invoices past due date
- `Filter Unnotified`: Skip invoices already reminded
- `Check Notification History`: Prevent duplicate reminders
- `Send Payment Reminder Email`: Customer receives overdue notice via Shopify
- `Log Notification Sent`: Track all sent reminders

**Overdue Logic**:
- Invoice due date passed → Trigger notification
- Check if reminder already sent (avoid spam)
- Send professional payment reminder
- Log for audit trail

---

## Database Schema

```mermaid
erDiagram
    sync_state {
        SERIAL id PK
        VARCHAR shopify_order_id UK
        VARCHAR sevdesk_contact_id
        VARCHAR sevdesk_invoice_id
        VARCHAR sync_status
        TEXT error_message
        INT retry_count
        TIMESTAMP created_at
        TIMESTAMP updated_at
        VARCHAR webhook_id UK
    }
    
    notification_history {
        SERIAL id PK
        VARCHAR sevdesk_invoice_id FK
        VARCHAR notification_type
        VARCHAR customer_email
        TIMESTAMP sent_at
        VARCHAR shopify_message_id
        TEXT error_message
    }
```

The **sync_state** table tracks the synchronization status of each order:

- `shopify_order_id`: Unique Shopify order ID (gid://shopify/Order/...)
- `webhook_id`: Unique webhook ID (idempotency key)
- `sync_status`: `pending`, `processing`, `completed`, `failed`
- `sevdesk_contact_id`: Sevdesk contact ID after customer lookup
- `sevdesk_invoice_id`: Sevdesk invoice ID after creation
- `error_message`: Last error details for debugging
- `retry_count`: Number of retry attempts (max 5)
- `created_at`: When webhook first received
- `updated_at`: Last status change

The **notification_history** table tracks all customer notifications:

- `sevdesk_invoice_id`: Invoice that triggered notification
- `notification_type`: `payment_received`, `payment_overdue`
- `customer_email`: Email recipient
- `sent_at`: When notification was sent
- `shopify_message_id`: Shopify email message ID for tracking
- `error_message`: Error details if send failed

**Indexes**:
- `idx_sync_status`: Fast filtering by status (reconciliation)
- `idx_updated_at`: Time-based queries (find stale records)
- `idx_notification_invoice`: Find notifications by invoice
- `idx_notification_type`: Filter by notification type

**Unique Constraints**:
- `shopify_order_id`: Prevent duplicate orders
- `webhook_id`: Prevent duplicate webhook processing

---

## Security Architecture

```mermaid
graph TD
    %% Security Flow
    
    subgraph ShopifyWebhook ["Shopify Webhook"]
        Request[POST Request]
        Header[X-Shopify-Hmac-SHA256 Header]
        Body[JSON Payload]
    end
    style ShopifyWebhook fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph SecurityLayer ["Security Layer"]
        Extract[Extract HMAC from Header]
        Compute[Compute HMAC-SHA256]
        Compare[Compare HMACs]
        Verify[Verify Timestamp]
    end
    style SecurityLayer fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Secrets ["Secrets Management"]
        EnvVars[Environment Variables]
        Secret[SHOPIFY_WEBHOOK_SECRET]
    end
    style Secrets fill:#ffffff,stroke:#000000,stroke-width:2px
    
    Request --> Extract
    Header --> Extract
    Body --> Compute
    Secret --> Compute
    Extract --> Compare
    Compute --> Compare
    Compare -- "Match" --> Verify
    Compare -- "Mismatch" --> Reject[Reject 403]
    Verify -- "Recent" --> Allow[Process Webhook]
    Verify -- "Old" --> Reject
    EnvVars --> Secret
    
    %% Classes
    class Request,Header,Body software;
    class Extract,Compute,Compare,Verify software;
    class EnvVars,Secret files;
    class Reject,Allow software;
    
    %% Class Definitions
    classDef software fill:#ffffff,stroke:#ff6d00,stroke-width:3px,color:#000;
    classDef files fill:#ffffff,stroke:#19ffb5,stroke-width:3px,color:#000;
```

The diagram illustrates the **Security Architecture**:

- `HMAC Verification`: Uses SHA-256 to verify webhook authenticity
- `Secret Management`: Webhook secret stored in environment variables (never hardcoded)
- `Timestamp Verification`: Rejects webhooks older than 5 minutes (prevents replay attacks)
- `Reject 403`: Invalid HMAC triggers security event log

**Security Requirements**:
1. HMAC verification on all webhooks (CRITICAL)
2. Environment variables for secrets (CRITICAL)
3. Timestamp validation (HIGH)
4. No customer emails in logs (HIGH)
5. HTTPS only (CRITICAL on Uberspace)

---

## Phase 2: Reconciliation Flow

```mermaid
graph TD
    %% Reconciliation Job Flow
    
    subgraph CronJob ["Reconciliation Job (5-10 min)"]
        Start[Job Starts]
        QueryDB[Query sync_state for failed]
        PollShopify[Poll Shopify Orders API]
    end
    style CronJob fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Processing ["Reconciliation Logic"]
        Compare[Compare Shopify vs Database]
        Retry[Retry Failed Invoices]
        Create[Create Missing Invoices]
    end
    style Processing fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph External ["External APIs"]
        Shopify[Shopify API]
        Sevdesk[Sevdesk API]
    end
    style External fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Database ["Database"]
        SyncState[(sync_state)]
    end
    style Database fill:#ffffff,stroke:#000000,stroke-width:2px
    
    Start --> QueryDB
    Start --> PollShopify
    QueryDB --> SyncState
    PollShopify --> Shopify
    QueryDB --> Compare
    PollShopify --> Compare
    Compare -- "Missing Order" --> Create
    Compare -- "Failed Invoice" --> Retry
    Retry --> Sevdesk
    Create --> Sevdesk
    Retry --> SyncState
    Create --> SyncState
    
    %% Classes
    class Start,QueryDB,PollShopify software;
    class Compare,Retry,Create software;
    class Shopify,Sevdesk software;
    class SyncState files;
    
    %% Class Definitions
    classDef software fill:#ffffff,stroke:#ff6d00,stroke-width:3px,color:#000;
    classDef files fill:#ffffff,stroke:#19ffb5,stroke-width:3px,color:#000;
```

The diagram illustrates the **Phase 2 Reconciliation Flow**:

- `Query sync_state`: Find orders with `sync_status = 'failed'` or retry_count > 0
- `Poll Shopify Orders API`: Fetch orders from last 24 hours
- `Compare`: Identify missing orders (webhook missed) or failed invoices
- `Retry Failed Invoices`: Exponential backoff (1 min, 5 min, 30 min, 2 hrs, 12 hrs)
- `Create Missing Invoices`: Handle webhook delivery failures

**Reconciliation Strategy**:
1. Run every 5-10 minutes (cron job)
2. Query `sync_state` for failed records
3. Poll Shopify for recent orders
4. Compare and identify gaps
5. Retry with exponential backoff
6. Update sync_state after each attempt

---

## Deployment Architecture (Uberspace)

```mermaid
graph TD
    %% Uberspace Deployment
    
    subgraph Internet ["Internet"]
        Customer[Customer Browser]
        ShopifyCloud[Shopify Cloud]
    end
    style Internet fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Uberspace ["Uberspace Server (Germany)"]
        Nginx[Nginx Reverse Proxy]
        NodeApp[Node.js App :3000]
        Supervisor[supervisord Process Manager]
        Postgres[(PostgreSQL Database)]
        Logs[Log Files]
    end
    style Uberspace fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Sevdesk ["Sevdesk Cloud"]
        SevdeskAPI[Sevdesk API]
    end
    style Sevdesk fill:#ffffff,stroke:#000000,stroke-width:2px
    
    Customer --> Nginx
    ShopifyCloud -- "HTTPS Webhook" --> Nginx
    Nginx -- "Proxy to localhost:3000" --> NodeApp
    Supervisor -- "Monitors/Restarts" --> NodeApp
    NodeApp -- "Read/Write" --> Postgres
    NodeApp -- "Write Logs" --> Logs
    NodeApp -- "HTTPS API Calls" --> SevdeskAPI
    
    %% Classes
    class Customer,ShopifyCloud hardware;
    class Nginx,NodeApp,Supervisor software;
    class Postgres,Logs files;
    class SevdeskAPI software;
    
    %% Class Definitions
    classDef hardware fill:#ffffff,stroke:#731bd1,stroke-width:3px,color:#000;
    classDef software fill:#ffffff,stroke:#ff6d00,stroke-width:3px,color:#000;
    classDef files fill:#ffffff,stroke:#19ffb5,stroke-width:3px,color:#000;
```

The diagram illustrates the **Uberspace Deployment Architecture**:

- `Nginx`: Reverse proxy handling HTTPS termination (Uberspace managed)
- `Node.js App`: Express server listening on localhost:3000
- `supervisord`: Process manager ensuring app runs continuously
- `PostgreSQL`: Database for sync state tracking
- `Log Files`: Structured JSON logs for debugging

**Deployment Requirements**:
1. Uberspace account (EUR 6-9/month)
2. Web backend: `uberspace web backend set / --http --port 3000`
3. Database: `uberspace tools version use postgresql 15`
4. supervisord: Auto-restart on crashes
5. HTTPS: Automatic via Uberspace (Let's Encrypt)

---

## Technology Stack

```mermaid
graph TD
    %% Technology Stack Diagram
    
    subgraph Runtime ["Runtime Environment"]
        Node[Node.js 20.x LTS]
        TS[TypeScript 5.x]
    end
    style Runtime fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Framework ["Web Framework"]
        Express[Express.js 4.x]
        Middleware[Middleware Stack]
    end
    style Framework fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Database ["Database Layer"]
        PG[PostgreSQL 15]
        PGClient[node-postgres pg]
    end
    style Database fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph APIs ["External APIs"]
        ShopifySDK[@shopify/shopify-api]
        SevdeskREST[Sevdesk REST API]
    end
    style APIs fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Testing ["Testing & Quality"]
        Jest[Jest Testing Framework]
        Supertest[Supertest HTTP Testing]
        TSLint[ESLint + TypeScript]
    end
    style Testing fill:#ffffff,stroke:#000000,stroke-width:2px
    
    subgraph Utilities ["Utilities"]
        Dotenv[dotenv Config]
        Winston[Winston Logging]
        Cron[node-cron Scheduling]
    end
    style Utilities fill:#ffffff,stroke:#000000,stroke-width:2px
    
    Node --> TS
    TS --> Express
    Express --> Middleware
    Express --> PGClient
    PGClient --> PG
    Express --> ShopifySDK
    Express --> SevdeskREST
    Express --> Winston
    Middleware --> Winston
    Cron --> Express
    
    %% Testing connections
    Jest --> Express
    Supertest --> Express
    TSLint --> TS
    
    %% Config
    Dotenv --> Node
    
    %% Classes
    class Node,TS software;
    class Express,Middleware software;
    class PG files;
    class PGClient software;
    class ShopifySDK,SevdeskREST software;
    class Jest,Supertest,TSLint software;
    class Dotenv,Winston,Cron software;
    
    %% Class Definitions
    classDef software fill:#ffffff,stroke:#ff6d00,stroke-width:3px,color:#000;
    classDef files fill:#ffffff,stroke:#19ffb5,stroke-width:3px,color:#000;
```

The diagram illustrates the **Technology Stack**:

**Runtime**:
- Node.js 20.x LTS (long-term support)
- TypeScript 5.x (strict mode, type safety)

**Web Framework**:
- Express.js 4.x (minimal, flexible)
- Middleware: HMAC verification, error handling, logging

**Database**:
- PostgreSQL 15 (ACID compliance, JSON support)
- node-postgres (pg) client library

**External APIs**:
- @shopify/shopify-api SDK (webhooks, REST/GraphQL)
- Sevdesk REST API (direct HTTP calls)

**Testing & Quality**:
- Jest (unit + integration tests)
- Supertest (HTTP endpoint testing)
- ESLint + TypeScript (code quality)

**Utilities**:
- dotenv (environment variables)
- Winston (structured logging)
- node-cron (reconciliation scheduling)

---

## Validation Checklist

All diagrams follow Creative Tech standards:

- [x] All subgraphs have white backgrounds (`fill:#ffffff`)
- [x] All nodes use Creative Tech colors (purple/teal/orange borders)
- [x] No yellow backgrounds visible in rendered diagrams
- [x] Subgraph identifiers match style references exactly
- [x] Description paragraphs explain diagram purpose
- [x] Hardware (purple): Customer browsers, Shopify cloud
- [x] Files (teal): Database, logs, config files
- [x] Software (orange): Services, APIs, processors

---

## References

- Technical Specification: `workspace/docs/planning/A1-tech-spec.md`
- Phase 1 Implementation Plan: `workspace/docs/planning/A2-phase1-plan.md`
- Comprehensive Synthesis: `workspace/docs/knowledge/comprehensive-synthesis.md`
- Mermaid Standards: `workspace/docs/global/documentation/mermaid-diagram-standards.md`
