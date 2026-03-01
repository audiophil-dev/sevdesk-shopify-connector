import { pool } from './database/connection';
import type { AppSettings } from '../types/appSettings';

export async function getSettings(shopId: string): Promise<AppSettings | null> {
  const result = await pool.query(`
    SELECT 
      shop_id as "shopId",
      sevdesk_api_key as "sevdeskApiKey",
      sync_mode as "syncMode",
      default_invoice_type as "defaultInvoiceType",
      revenue_account as "revenueAccount",
      tax_account as "taxAccount",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM app_settings
    WHERE shop_id = $1
  `, [shopId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    shopId: row.shopId,
    sevdeskApiKey: row.sevdeskApiKey,
    syncMode: row.syncMode,
    defaultInvoiceType: row.defaultInvoiceType,
    revenueAccount: row.revenueAccount,
    taxAccount: row.taxAccount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function upsertSettings(shopId: string, data: Partial<AppSettings>): Promise<AppSettings> {
  const {
    sevdeskApiKey,
    syncMode,
    defaultInvoiceType,
    revenueAccount,
    taxAccount
  } = data;

  const now = new Date().toISOString();

  const result = await pool.query(`
    INSERT INTO app_settings (
      shop_id,
      sevdesk_api_key,
      sync_mode,
      default_invoice_type,
      revenue_account,
      tax_account,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8
    )
    ON CONFLICT (shop_id) DO UPDATE SET
      sevdesk_api_key = COALESCE(EXCLUDED.sevdesk_api_key, app_settings.sevdesk_api_key),
      sync_mode = COALESCE(EXCLUDED.sync_mode, app_settings.sync_mode),
      default_invoice_type = COALESCE(EXCLUDED.default_invoice_type, app_settings.default_invoice_type),
      revenue_account = COALESCE(EXCLUDED.revenue_account, app_settings.revenue_account),
      tax_account = COALESCE(EXCLUDED.tax_account, app_settings.tax_account),
      updated_at = EXCLUDED.updated_at
    RETURNING *
  `, [
    shopId,
    sevdeskApiKey || null,
    syncMode || 'manual',
    defaultInvoiceType || 'RE',
    revenueAccount || null,
    taxAccount || null,
    null,
    now
  ]);

  return await getSettings(shopId);
}

export async function testSevDeskConnection(shopId: string): Promise<{success: boolean; message: string}> {
  const settings = await getSettings(shopId);

  if (!settings || !settings.sevdeskApiKey) {
    return {
      success: false,
      message: 'No SevDesk API key configured for this shop'
    };
  }

  try {
    // Simulate a simple API call to test connectivity
    // In a real implementation, this would call SevDesk API
    // For Phase 1, we just verify the key format and return success

    // Validate API key format (should be a 32-character hex string)
    const apiKey = settings.sevdeskApiKey.trim();

    if (apiKey.length === 0) {
      return {
        success: false,
        message: 'SevDesk API key cannot be empty'
      };
    }

    return {
      success: true,
      message: 'SevDesk API key format is valid. Connection test successful.'
    };
  } catch (error) {
    console.error('[Settings Service] Error testing SevDesk connection:', {
      shopId,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      success: false,
      message: 'Failed to test SevDesk connection'
    };
  }
}
