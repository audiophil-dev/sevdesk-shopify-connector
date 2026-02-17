# Research: Sevdesk API Capabilities for Invoice Creation

**Agent**: @technology-researcher
**Date**: 2026-02-17
**Research Question**: What are Sevdesk's API capabilities for creating invoices from Shopify orders?
**Depth Level**: Comprehensive
**Time Budget**: 45 minutes

## Executive Summary

Sevdesk provides a comprehensive REST API for invoice creation with strong support for German accounting requirements. Key findings include: API key authentication with base URL `https://my.sevdesk.de/api/v1/`, invoice creation via POST /Invoice endpoint, contact management through the Contact API, and support for e-invoices (XRechnung/ZUGFeRD). The API has pagination limits capped at 1000 records per request (effective May 2025). Webhook support is available through the Webhooks management API. Tax handling supports multiple VAT rules including Reverse Charge and OSS for cross-border sales. Sevdesk is GoBD-compliant out of the box.

## Key Findings

### 1. Invoice Creation API

#### Endpoint Overview

The primary endpoint for invoice creation is:
```
POST https://my.sevdesk.de/api/v1/Invoice
```

Additional factory endpoints provide specialized functionality:
- `POST /Invoice/Factory/createInvoiceFromOrder` - Create invoice from existing order
- `POST /Invoice/Factory/createInvoiceReminder` - Create invoice reminder
- `GET /Invoice/{id}/cancel` - Cancel an invoice
- `POST /Invoice/{id}/duplicate` - Duplicate an existing invoice
- `DELETE /Invoice/{id}` - Delete an invoice

Source: [sevdesk-php-client/InvoiceApi.md](https://github.com/Pommespanzer/sevdesk-php-client/blob/master/docs/Api/InvoiceApi.md) [3/5]

#### Required Fields for Invoice Creation

According to the PHP client documentation and blog posts, the minimum required components are:

1. **Contact** (customer) - Must exist in Sevdesk prior to invoice creation
2. **Invoice Header**:
   - `invoiceDate` - Date of invoice
   - `deliveryDate` - Optional delivery date
   - `creditworthy` - Boolean for credit assessment
   - `sevClient` - Your Sevdesk client ID

3. **Address** - Customer billing address with:
   - `name` - Contact name
   - `street` - Street address
   - `zip` - Postal code
   - `city` - City
   - `country` - Country code

4. **Line Items** - Array of invoice positions with:
   - `name` - Item description
   - `quantity` - Number of units
   - `unitPrice` - Price per unit (gross or net depending on configuration)
   - `taxRate` - VAT percentage
   - `accountingType` - Revenue account reference

Source: [Laravel Sevdesk - Creating Invoices via API](https://martin-appelmann.de/en/blog/laravel-sevdesk-creating-invoices-via-api/) [3/5]

#### Tax Handling

Sevdesk supports multiple tax configurations:

| Tax Type | Description | Use Case |
|----------|-------------|----------|
| Standard | Regular VAT (e.g., 19%, 7%) | Domestic sales |
| Reduced | Reduced VAT rate (7%) | Specific goods/services |
| Reverse Charge | §18b UStG | Cross-border B2B |
| OSS | One-Stop-Shop | EU cross-border sales |
| Noteu | Non-EU | Services to non-EU customers |

The API supports setting tax via `taxRate` field on line items or via `taxRule` parameter for complex scenarios.

Source: [sevDesk Tech Blog - VAT Rules](https://tech.sevdesk.com/api_news/) [5/5]

### 2. Authentication Methods

#### API Key Authentication

Sevdesk uses API key authentication with the following pattern:

```
Authorization: api_key SEVDESK_API_KEY
```

Or via query parameter:
```
https://my.sevdesk.de/api/v1/Invoice?token=SEVDESK_API_KEY
```

The authentication is passed in the HTTP headers or as a query parameter. The base URL is `https://my.sevdesk.de/api/v1/`.

Source: [dltHub - Load Sevdesk data in Python](https://dlthub.com/context/source/sevdesk) [3/5]

#### Key Management

- API keys are generated in the Sevdesk web interface under Settings > API
- Each API key is tied to a specific Sevdesk account
- The API key must be kept secure and not exposed in client-side code
- There is no OAuth 2.0 - only API key authentication

Source: [apitracker.io - sevDesk API](https://apitracker.io/a/sevdesk) [3/5]

#### February 2025 Breaking Change: API Authentication

As of February 2025, sevdesk removed an older API authentication method to increase security. Ensure your integration uses only the documented API token authentication.

Source: [sevDesk Tech Blog - Authentication Change](https://tech.sevdesk.com/api_news/posts/2025_02_06-api-authentication-removal/) [5/5]

### 3. Rate Limits and Pagination

#### Pagination Limits (Effective May 2025)

As of May 30, 2025, Sevdesk enforces strict pagination limits:

- **Maximum limit**: 1000 records per request
- **Minimum limit**: 1 record
- **Invalid limits**: Non-integer values or values outside 1-1000 range return HTTP 400 error

Current behavior (until May 30, 2025):
- Can request up to 10,000 records with `?limit=10000`
- Arbitrary text values bypass limit (will be blocked)

**Recommendation**: Implement pagination with `limit=1000` and use offset or cursor-based pagination to fetch larger datasets.

Source: [sevDesk Tech Blog - Pagination Limits](https://tech.sevdesk.com/api_news/posts/2025_03_11-api_pagination_limits/) [5/5]

#### Rate Limits

Specific rate limits are not publicly documented. Based on community reports and integration platforms (Make, Pipedream), reasonable usage is:
- Standard API calls: No explicit limit mentioned
- Recommended: Implement exponential backoff for 429 responses
- Batch operations: Process in chunks of 100-500 records

### 4. Webhook Support

#### Webhooks Available

Sevdesk provides webhook support for various events:

- **Invoice events**: Invoice created, updated, sent, paid
- **Contact events**: Contact created, updated
- **Voucher events**: Receipt created, updated

The webhook system is managed via a dedicated API:
- Webhooks management API available
- Webhook events can be configured for specific object types

Source: [apitracker.io - sevDesk API](https://apitracker.io/a/sevdesk) [3/5]

#### Webhook Implementation

For real-time order sync from Shopify to Sevdesk, you would typically:
1. Use Shopify webhooks to detect new/updated orders
2. Process the order data through your connector
3. Create/update invoice in Sevdesk via API
4. Sevdesk webhooks can then notify your system of invoice status changes

**Limitation**: Sevdesk webhooks are primarily for receiving data, not pushing in real-time. For the Shopify-to-Sevdesk sync direction, you rely on Shopify webhooks.

### 5. Contact Management

#### Contact API Endpoints

```
POST https://my.sevdesk.de/api/v1/Contact
```

Supported operations:
- `POST /Contact` - Create new contact (person or company)
- `POST /Contact/{id}/addAddress` - Add address to contact
- `POST /Contact/{id}/addCommunicationWay` - Add email/phone
- `POST /Contact/{id}/addEmail` - Add email address
- `POST /Contact/{id}/addPhone` - Add phone number
- `POST /Contact/{id}/addMobile` - Add mobile number
- `POST /Contact/{id}/addWebsite` - Add website
- `POST /Contact/Factory/createContact` - Factory method for complex creation

Source: [sevdesk-php-client/ContactApi.md](https://github.com/Pommespanzer/sevdesk-php-client/blob/master/docs/Api/ContactApi.md) [3/5]

#### Contact Creation from Shopify Customer

For Shopify order integration, you need to:

1. **Check if contact exists** - Search by email using GET /Contact with filter
2. **Create contact if not exists** - POST to /Contact with:
   - `customerNumber` - Optional custom ID
   - `name` - Full name or company name
   - `firstName` - First name (for persons)
   - `lastName` - Last name (for persons)
   - `email` - Contact email
   - `phone` - Phone number (if available)
3. **Add address** - POST to /Contact/{id}/addAddress with billing address

**Important**: The contact must exist before creating an invoice - invoice creation requires a contact ID reference.

### 6. Order/Invoice Status

#### Invoice Status Values

Sevdesk uses numeric status codes for invoices:

| Status Code | Name | Description |
|-------------|------|-------------|
| 50 | Deactivated | Recurring invoice deactivated |
| 100 | Draft | Invoice created but not sent |
| 200 | Open | Invoice sent, awaiting payment |
| 500 | Partially Paid | Partial payment received (introduced April 2024) |
| 1000 | Paid | Fully paid |

Source: [sevDesk Tech Blog - Status Changes](https://tech.sevdesk.com/api_news/posts/2024_04_04-changing-status-invoices-cretid-notes/) [5/5]

#### Changing Invoice Status

As of April 2024, manual status changes are deprecated. Use dedicated endpoints:

- `PUT /api/v1/Invoice/{invoiceId}/bookAmount` - Mark as paid (book partial or full payment)
- `PUT /api/v1/Invoice/{invoiceId}/resetToOpen` - Reset to open status
- `PUT /api/v1/Invoice/{invoiceId}/resetToDraft` - Reset to draft
- `PUT /api/v1/Invoice/{invoiceId}/sendBy` - Mark as sent
- `POST /api/v1/Invoice/{invoiceId}/sendViaEmail` - Send via email

Important: Invoices must be created with status "Draft" (100). Status can only be elevated through these endpoints, not directly set.

Source: [sevDesk Tech Blog - Status Changes](https://tech.sevdesk.com/api_news/posts/2024_04_04-changing-status-invoices-cretid-notes/) [5/5]

#### Payment Tracking for Shopify Orders

For the connector to track payment status:

1. **Create invoice as draft** - POST /Invoice with status=100
2. **Mark as sent when Shopify payment received** - Use /bookAmount endpoint
3. **Query invoice status** - GET /Invoice/{id} to check current status
4. **Webhook for status changes** - Subscribe to invoice update events

The invoice status provides the canonical payment state that should sync back to Shopify as needed.

#### Supported Document Types

| Type | Code | Description |
|------|------|-------------|
| Invoice | RE | Standard invoice (Rechnung) |
| Advance Invoice | AR | Advance payment invoice |
| Partial Invoice | TR | Partial invoice (Teilrechnung) |
| Final Invoice | ER | Final invoice (Endrechnung) |
| Credit Note | GU | Gutschrift (credit memo) |
| Order | AB | Order/Quote |

The API handles these via the `invoiceType` or `type` parameter.

Source: [sevdesk-php-client/InvoiceApi.md](https://github.com/Pommespanzer/sevdesk-php-client/blob/master/docs/Api/InvoiceApi.md) [3/5]

#### Draft vs. Final

- **Draft**: Created with status "draft" - not legally binding
- **Final**: Sent via Sevdesk or marked as sent - legally binding

The invoice is created as a draft by default. To finalize:
- Use `status` field during creation, OR
- Call update endpoint to change status after review

#### E-Invoice Support (XRechnung/ZUGFeRD)

As of November 2024, Sevdesk supports e-invoice creation via API:

- Set `propertyIsEInvoice: true` on invoice
- XML is embedded in PDF (ZUGFeRD format)
- Get standalone XML via `/Invoice/{id}/getXml`
- Supported for both system versions 1.0 and 2.0

**Required data for e-invoices**:
- sevClient: vatNumber, taxNumber, contactPhone, contactEmail, bankBic, bankIban
- Contact: email, buyerReference
- Invoice: addressCountry, addressCity, addressZip, addressStreet, paymentMethod

Source: [sevDesk Tech Blog - E-Invoice API](https://tech.sevdesk.com/api_news/posts/2024_11_15-einvoice_changes/) [5/5]

### 8. System Version Differences (v1 vs v2)

Sevdesk operates two system versions with different API behaviors:

#### Key Differences

| Feature | System v1 | System v2 |
|---------|-----------|------------|
| Tax handling | `taxType` (default, eu, ss, noteu) | `taxRule` (numeric codes 1-21) |
| E-invoice | Available since Dec 2024 | Available since Nov 2024 |
| Tax rule customization | Basic | Advanced (OSS, Reverse Charge) |
| Status change | Direct modification allowed | Must use endpoints |

#### Checking System Version

```
GET /api/v1/CheckAccount
```

The response indicates which system version the client uses. Use this to determine which tax fields to send.

Source: [sevDesk Tech Blog - System Update 2.0](https://tech.sevdesk.com/api_news/posts/2024_04_04-system-update-breaking-changes/) [5/5]

### 9. German Accounting Requirements (GoBD)

#### GoBD Compliance

Sevdesk is marketed as GoBD-compliant software. Key compliance features:

- **Digital accounting**: All data stored digitally with audit trail
- **Manipulation protection**: Changes are logged with timestamps
- **Data retention**: 10-year retention period supported
- **Tax calculation**: Automatic VAT calculation based on settings
- **Revenue recording**: Automatic posting to correct accounts

Source: [sevdesk.com - Online Accounting](https://www.sevdesk.com/) [4/5]

#### Required Invoice Fields (German Law)

German invoices must contain (per §14 UStG):

| Field | Required | Sevdesk Mapping |
|-------|----------|-----------------|
| Invoice number | Yes | `invoiceNumber` (auto-generated or custom) |
| Date | Yes | `invoiceDate` |
| Seller name/address | Yes | From sevClient settings |
| Buyer name/address | Yes | From Contact + Address |
| VAT ID (B2B) | Yes (B2B) | `buyerReference` for e-invoice |
| Item description | Yes | Line item `name` |
| Quantity | Yes | Line item `quantity` |
| Unit price | Yes | Line item `unitPrice` |
| Total amount | Yes | Calculated automatically |
| VAT amount/rate | Yes | Line item `taxRate` |
| Payment terms | Sometimes | `paymentMethod`, `paymentTerms` |
| Due date | Sometimes | `expirationDate` |

Source: [sevdesk.com - Invoice Program](https://www.sevdesk.com/online-invoicing-program) [4/5]

#### E-Invoice Mandate Compliance

Germany's e-invoicing requirements:

- **2025**: All businesses must receive structured e-invoices
- **2028**: Mandatory issuing for all businesses
- **Formats**: XRechnung (XML) or ZUGFeRD 2.1+

Sevdesk supports both formats natively through the API.

Source: [ClearTax - E-Invoicing in Germany](https://www.cleartax.com/de/en/e-invoicing-for-small-businesses-in-germany) [3/5]

## Integration Mapping: Shopify Order to Sevdesk Invoice

Based on the API capabilities, here is the recommended mapping:

### Shopify Data to Sevdesk Fields

| Shopify Field | Sevdesk Field | Notes |
|--------------|---------------|-------|
| order.id | Reference (custom) | Store Shopify order ID |
| order.email | Contact email | For contact lookup/create |
| order.created_at | invoiceDate | Or fulfillment date |
| customer.first_name + last_name | Contact name | Or company name |
| customer.phone | Contact phone | Optional |
| billing_address | Address | Required for invoice |
| line_items[].title | Line item name | Product title |
| line_items[].quantity | Line item quantity | Units ordered |
| line_items[].price | Line item unitPrice | Per-unit price |
| line_items[].tax_lines[].rate | Line item taxRate | VAT percentage |
| order.total_tax | Tax total | Validated against line items |
| order.total_price | Invoice total | Must match sum |

### Workflow

1. **Receive Shopify order** via webhook (order.created/fulfilled)
2. **Check contact existence** - Search Sevdesk by customer email
3. **Create or update contact** if needed with address
4. **Map line items** - Convert Shopify line items to Sevdesk invoice positions
5. **Calculate taxes** - Map Shopify tax lines to Sevdesk tax rates
6. **Create invoice** via POST /Invoice
7. **Handle response** - Store Sevdesk invoice ID for reference
8. **Optional: Send invoice** via Sevdesk or download PDF

## SDKs and Libraries

| Language | Library | Stars | Status |
|----------|---------|-------|--------|
| PHP | sevdesk-php-client | 11 | Community |
| PHP | j-mastr/sevdesk-php-sdk | 6 | MIT License |
| Go | gowizzard/sevdesk | 5 | Community |
| Python | dltHub/dlt | N/A | Integration |

For Node.js/JavaScript, no official SDK exists. Use HTTP client (fetch, axios) with the REST API.

Source: [GitHub - sevdesk-php-client](https://github.com/Pommespanzer/sevdesk-php-client) [3/5]
Source: [GitHub - gowizzard/sevdesk](https://github.com/gowizzard/sevdesk) [3/5]

## Recommendations

### High Priority

1. **Implement Contact Lookup First**
   - Always check for existing contact by email before creating invoice
   - Cache contact IDs to reduce API calls

2. **Handle Pagination Correctly**
   - Use limit=1000 for all list endpoints
   - Implement offset-based pagination for large datasets
   - Prepare for May 2025 limit enforcement

3. **Tax Rate Mapping**
   - Map Shopify tax rates to Sevdesk tax configurations
   - Handle reduced VAT (7%) vs standard (19%) for different product types

### Medium Priority

4. **E-Invoice Readiness**
   - If dealing with B2B customers, prepare for XRechnung/ZUGFeRD
   - Collect buyerReference (USt-IdNr) from customers

5. **Error Handling**
   - Implement retry with exponential backoff
   - Log all API errors for debugging
   - Handle 400 errors (especially pagination) gracefully

6. **Webhook Consideration**
   - Use Shopify webhooks for order detection
   - Consider Sevdesk webhooks for invoice status sync back to Shopify

### Lower Priority

7. **Invoice Numbering**
   - Decide on custom numbering or Sevdesk auto-generation
   - If custom, implement collision detection

8. **Duplicate Prevention**
   - Store Shopify order ID in Sevdesk invoice
   - Check for duplicates before creating

## Risks and Considerations

| Risk | Mitigation |
|------|------------|
| API changes without notice | Monitor sevDesk Tech Blog |
| Rate limiting | Implement exponential backoff |
| Contact creation failures | Pre-validate customer data |
| Tax calculation mismatches | Validate totals before submission |
| GoBD non-compliance | Use Sevdesk's built-in validation |
| E-invoice mandate | Prepare XML generation now |

## Gaps and Uncertainties

- **Exact rate limits**: Not publicly documented; need to test empirically
- **Webhook delivery reliability**: Community feedback suggests occasional delays
- **API version deprecation**: unclear roadmap for v1 vs v2
- **OAuth availability**: No OAuth 2.0; API key only (security consideration)

## Sources

### Primary Sources ([4/5]-[5/5])
- [sevDesk Tech Blog - E-Invoice API](https://tech.sevdesk.com/api_news/posts/2024_11_15-einvoice_changes/) [5/5]
- [sevDesk Tech Blog - Pagination Limits](https://tech.sevdesk.com/api_news/posts/2025_03_11-api_pagination_limits/) [5/5]
- [sevDesk Tech Blog - VAT Rules](https://tech.sevdesk.com/api_news/) [5/5]
- [sevdesk.com - Online Accounting](https://www.sevdesk.com/) [4/5]
- [sevdesk.com - Invoice Program](https://www.sevdesk.com/online-invoicing-program) [4/5]

### Supporting Sources ([3/5])
- [sevdesk-php-client/InvoiceApi.md](https://github.com/Pommespanzer/sevdesk-php-client/blob/master/docs/Api/InvoiceApi.md) [3/5]
- [sevdesk-php-client/ContactApi.md](https://github.com/Pommespanzer/sevdesk-php-client/blob/master/docs/Api/ContactApi.md) [3/5]
- [Laravel Sevdesk - Creating Invoices via API](https://martin-appelmann.de/en/blog/laravel-sevdesk-creating-invoices-via-api/) [3/5]
- [apitracker.io - sevDesk API](https://apitracker.io/a/sevdesk) [3/5]
- [dltHub - Load Sevdesk data in Python](https://dlthub.com/context/source/sevdesk) [3/5]
- [GitHub - gowizzard/sevdesk](https://github.com/gowizzard/sevdesk) [3/5]
- [ClearTax - E-Invoicing in Germany](https://www.cleartax.com/de/en/e-invoicing-for-small-businesses-in-germany) [3/5]

---
**Research completed**: 2026-02-17 18:59:00
**Time spent**: ~45 minutes
