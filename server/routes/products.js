const express = require('express');
const router = express.Router();
const pool = require('../db'); 

// Fetch all products
router.get('/', async (req, res) => {
  console.log('[Product Router] Received request for all products');
  try {
    if (!pool || typeof pool.query !== 'function') {
       console.error('[Product Router] --- FATAL: Database pool is not available! ---');
       return res.status(500).json({ error: 'Database connection not initialized.' });
    }
    const result = await pool.query('SELECT id, name, price, image_url, description FROM products ORDER BY name ASC');
    console.log(`[Product Router] Found ${result.rows.length} products`);
    res.json(result.rows);
  } catch (err) {
    console.error('[Product Router] Error during / query execution:', err.stack);
    res.status(500).json({ error: 'Internal Server Error fetching products' });
  }
});

// Fetch a single product by ID
router.get('/:id', async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    console.log(`[Product Router] Received request for product ID: ${productId}`);

    if (isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid product ID format' });
    }

    try {
       if (!pool || typeof pool.query !== 'function') {
            console.error('[Product Router] --- FATAL: Database pool is not available! ---');
            return res.status(500).json({ error: 'Database connection not initialized.' });
       }
        const queryText = 'SELECT id, name, description, price, stock_quantity, image_url, category_id FROM products WHERE id = $1';
        const values = [productId];
        const result = await pool.query(queryText, values);

        if (result.rows.length === 0) {
            console.log(`[Product Router] Product with ID ${productId} not found`);
            return res.status(404).json({ error: 'Product not found.' });
        }
        console.log(`[Product Router] Found product with ID ${productId}: ${result.rows[0].name}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`[Product Router] Error during /:id query execution for ID ${productId}:`, err.stack);
        res.status(500).json({ error: 'Internal Server Error fetching product details' });
    }
});

module.exports = router;
