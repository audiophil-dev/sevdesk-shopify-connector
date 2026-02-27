# API Reference

## Sevdesk API

### Endpoints Used
1. **Fetch Paid Invoices**
   - **Endpoint:** `GET /api/v1/invoices`
   - **Description:** Retrieves a list of invoices with a `paid` status.
   - **Authentication:** Requires API key in the `Authorization` header.
   - **Request Example:**
     ```http
     GET /api/v1/invoices?status=paid HTTP/1.1
     Host: api.sevdesk.de
     Authorization: Bearer <API_KEY>
     ```
   - **Response Example:**
     ```json
     [
       {
         "id": "12345",
         "status": "paid",
         "amount": 100.0,
         "currency": "EUR",
         "customer": {
           "id": "67890",
           "name": "John Doe"
         }
       }
     ]
     ```

### Error Handling
- **Common Errors:**
  - `401 Unauthorized`: Invalid or missing API key.
  - `429 Too Many Requests`: Rate limit exceeded.
  - `500 Internal Server Error`: Server-side issue.

## Shopify API

### Endpoints Used
1. **Send Payment Confirmation Email**
   - **Endpoint:** `POST /admin/api/2023-01/orders/{order_id}/send_email`
   - **Description:** Triggers an email to confirm payment for a specific order.
   - **Authentication:** Requires Shopify Admin API access token.
   - **Request Example:**
     ```http
     POST /admin/api/2023-01/orders/98765/send_email HTTP/1.1
     Host: myshop.myshopify.com
     X-Shopify-Access-Token: <ACCESS_TOKEN>
     ```
   - **Response Example:**
     ```json
     {
       "success": true,
       "message": "Email sent successfully."
     }
     ```

### Error Handling
- **Common Errors:**
  - `401 Unauthorized`: Invalid or missing access token.
  - `404 Not Found`: Order ID does not exist.
  - `500 Internal Server Error`: Server-side issue.

## Notes
- Ensure API keys and tokens are securely stored and not hardcoded.
- Use exponential backoff for retrying failed requests to handle rate limits gracefully.
- Log all API interactions for debugging and auditing purposes.