const express = require('express');
const router = express.Router();
const pool = require('../db'); 

// Fetch all products
router.get('/', async (req, res) => {
  console.log('[Product Router] Received request for all products');
  let client;
  try {
    // Get a client from the pool
    client = await pool.connect();
    console.log('[Product Router] Successfully acquired database client');

    // Execute query with timeout
    const result = await Promise.race([
      client.query('SELECT id, name, price, image_url, description FROM products ORDER BY name ASC'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      )
    ]);

    console.log(`[Product Router] Found ${result.rows.length} products`);
    res.json(result.rows);
  } catch (err) {
    console.error('[Product Router] Error during / query execution:', err);
    if (err.message === 'Query timeout') {
      res.status(504).json({ error: 'Database query timed out' });
    } else {
      res.status(500).json({ error: 'Internal Server Error fetching products' });
    }
  } finally {
    if (client) {
      client.release();
      console.log('[Product Router] Released database client');
    }
  }
});

// Fetch a single product by ID
router.get('/:id', async (req, res) => {
    const productId = parseInt(req.params.id, 10);
    console.log(`[Product Router] Received request for product ID: ${productId}`);
    let client;

    if (isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid product ID format' });
    }

    try {
        // Get a client from the pool
        client = await pool.connect();
        console.log('[Product Router] Successfully acquired database client');

        const queryText = 'SELECT id, name, description, price, stock_quantity, image_url, category_id FROM products WHERE id = $1';
        const values = [productId];

        // Execute query with timeout
        const result = await Promise.race([
            client.query(queryText, values),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Query timeout')), 5000)
            )
        ]);

        if (result.rows.length === 0) {
            console.log(`[Product Router] Product with ID ${productId} not found`);
            return res.status(404).json({ error: 'Product not found.' });
        }

        console.log(`[Product Router] Found product with ID ${productId}: ${result.rows[0].name}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`[Product Router] Error during /:id query execution for ID ${productId}:`, err);
        if (err.message === 'Query timeout') {
            res.status(504).json({ error: 'Database query timed out' });
        } else {
            res.status(500).json({ error: 'Internal Server Error fetching product details' });
        }
    } finally {
        if (client) {
            client.release();
            console.log('[Product Router] Released database client');
        }
    }
});

module.exports = router;
