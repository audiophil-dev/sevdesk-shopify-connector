import { Router } from 'express';
import { getSettings, upsertSettings, testSevDeskConnection } from '../services/settingsService';

const router = Router();

// GET /api/settings
// Returns current app settings for a specific shop
router.get('/', async (req, res) => {
  const shop = req.headers['x-shopify-shop-domain'];

  if (!shop || typeof shop !== 'string') {
    return res.status(400).json({
      error: 'Missing or invalid shop domain header',
      code: 'INVALID_SHOP'
    });
  }

  try {
    const settings = await getSettings(shop);

    if (!settings) {
      return res.status(404).json({
        error: 'Settings not found for this shop',
        code: 'NOT_FOUND'
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('[Settings API] Error fetching settings:', {
      shop,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Failed to fetch settings',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

// PUT /api/settings
// Updates app settings for a specific shop
router.put('/', async (req, res) => {
  const shop = req.headers['x-shopify-shop-domain'];

  if (!shop || typeof shop !== 'string') {
    return res.status(400).json({
      error: 'Missing or invalid shop domain header',
      code: 'INVALID_SHOP'
    });
  }

  try {
    const settings = await upsertSettings(shop, req.body);
    res.json(settings);
  } catch (error) {
    console.error('[Settings API] Error updating settings:', {
      shop,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Failed to update settings',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

// POST /api/settings/test-connection
// Tests SevDesk API connection
router.post('/test-connection', async (req, res) => {
  const shop = req.headers['x-shopify-shop-domain'];

  if (!shop || typeof shop !== 'string') {
    return res.status(400).json({
      error: 'Missing or invalid shop domain header',
      code: 'INVALID_SHOP'
    });
  }

  try {
    const result = await testSevDeskConnection(shop);
    res.json(result);
  } catch (error) {
    console.error('[Settings API] Error testing connection:', {
      shop,
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: 'Failed to test connection',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

export default router;
