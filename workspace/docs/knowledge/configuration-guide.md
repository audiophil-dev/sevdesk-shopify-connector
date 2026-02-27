# Configuration Guide

## Environment Variables

### Sevdesk Integration
1. **SEVDESK_API_KEY**
   - **Description:** API key for authenticating with Sevdesk.
   - **Example:** `SEVDESK_API_KEY=your-sevdesk-api-key`

### Shopify Integration
1. **SHOPIFY_ACCESS_TOKEN**
   - **Description:** Access token for authenticating with Shopify Admin API.
   - **Example:** `SHOPIFY_ACCESS_TOKEN=your-shopify-access-token`
2. **SHOPIFY_STORE_URL**
   - **Description:** URL of the Shopify store.
   - **Example:** `SHOPIFY_STORE_URL=myshop.myshopify.com`

## Setup Instructions

### Step 1: Configure Environment Variables
- Create a `.env` file in the project root.
- Add the following variables:
  ```env
  SEVDESK_API_KEY=your-sevdesk-api-key
  SHOPIFY_ACCESS_TOKEN=your-shopify-access-token
  SHOPIFY_STORE_URL=myshop.myshopify.com
  ```

### Step 2: Install Dependencies
- Run the following command to install project dependencies:
  ```bash
  npm install
  ```

### Step 3: Start the Application
- Use the following command to start the application:
  ```bash
  npm start
  ```

### Step 4: Verify Configuration
- Ensure the application connects successfully to Sevdesk and Shopify APIs.
- Check logs for any errors or warnings.

## Notes
- Use a secure method to store and manage environment variables (e.g., AWS Secrets Manager, HashiCorp Vault).
- Rotate API keys and tokens periodically to enhance security.
- Test the configuration in a staging environment before deploying to production.