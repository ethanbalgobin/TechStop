const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken'); 

// Fetch all items in the logged-in user's cart
router.get('/', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    console.log(`[Cart Router] Fetching cart for user ID: ${userId}`);
    try {
        const query = `
            SELECT ci.product_id, ci.quantity, p.name, p.price, p.image_url
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = $1 ORDER BY ci.added_at ASC;
        `;
        const { rows } = await pool.query(query, [userId]);
        const cartItems = rows.map(item => ({
            product: { id: item.product_id, name: item.name, price: item.price, image_url: item.image_url },
            quantity: item.quantity
        }));
        
        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        
        console.log(`[Cart Router] Found ${cartItems.length} items for user ID: ${userId}`);
        res.status(200).json({ items: cartItems, total });
    } catch (error) {
        console.error(`[Cart Router] Error fetching cart for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error fetching cart' });
    }
});

// Add an item to the cart or update quantity
router.post('/items', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId, quantity } = req.body;
    if (!productId || quantity === undefined || quantity === null) {
        return res.status(400).json({ error: 'Product ID and quantity are required.' });
    }
    const intQuantity = parseInt(quantity, 10);
    if (isNaN(intQuantity) || intQuantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be a positive integer.' });
    }
    console.log(`[Cart Router] User ID: ${userId} adding/updating Product ID: ${productId} with Quantity: ${intQuantity}`);
    try {
        const query = `
            INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)
            ON CONFLICT (user_id, product_id) DO UPDATE SET
                quantity = cart_items.quantity + $3, updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `;
        await pool.query(query, [userId, productId, intQuantity]);
        console.log(`[Cart Router] Item added/updated for User ID: ${userId}, Product ID: ${productId}`);

        const getCartQuery = `
            SELECT ci.product_id, ci.quantity, p.name, p.price, p.image_url
            FROM cart_items ci JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = $1 ORDER BY ci.added_at ASC;
        `;
        const cartResult = await pool.query(getCartQuery, [userId]);
        const cartItems = cartResult.rows.map(item => ({
            product: { id: item.product_id, name: item.name, price: item.price, image_url: item.image_url },
            quantity: item.quantity
        }));
        
        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        
        res.status(201).json({ items: cartItems, total });
    } catch (error) {
        console.error(`[Cart Router] Error adding item for User ID ${userId}, Product ID ${productId}:`, error.stack);
        if (error.code === '23503') { return res.status(404).json({ error: 'Product not found.' }); }
        res.status(500).json({ error: 'Internal Server Error adding item to cart' });
    }
});

// Update quantity of a specific item
router.put('/items/:productId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.params;
    const { quantity } = req.body;
    if (quantity === undefined || quantity === null) {
        return res.status(400).json({ error: 'Quantity is required.' });
    }
    const intProductId = parseInt(productId, 10);
    const intQuantity = parseInt(quantity, 10);
    if (isNaN(intProductId)) { return res.status(400).json({ error: 'Invalid Product ID format.' }); }

    try {
        if (isNaN(intQuantity) || intQuantity <= 0) {
            // Remove item if quantity is 0 or less
            console.log(`[Cart Router] User ID: ${userId} requested quantity <= 0 for Product ID: ${intProductId}. Removing item.`);
            const deleteQuery = 'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING *';
            await pool.query(deleteQuery, [userId, intProductId]);
        } else {
            // Update quantity if > 0
            console.log(`[Cart Router] User ID: ${userId} updating Product ID: ${intProductId} to Quantity: ${intQuantity}`);
            const query = `
                UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2 AND product_id = $3 RETURNING *;
            `;
            const { rowCount } = await pool.query(query, [intQuantity, userId, intProductId]);
            if (rowCount === 0) {
                 console.log(`[Cart Router] Cart item not found for User ID: ${userId}, Product ID: ${intProductId} during update.`);
                 return res.status(404).json({ error: 'Cart item not found.' });
            }
            console.log(`[Cart Router] Quantity updated for User ID: ${userId}, Product ID: ${intProductId}`);
        }
        const getCartQuery = `
        SELECT ci.product_id, ci.quantity, p.name, p.price, p.image_url 
        FROM cart_items ci 
        JOIN products p ON ci.product_id = p.id 
        WHERE ci.user_id = $1 
        ORDER BY ci.added_at ASC;`;
        const cartResult = await pool.query(getCartQuery, [userId]);
        const cartItems = cartResult.rows.map(item => ({ 
            product: { 
                id: item.product_id, 
                name: item.name, 
                price: item.price, 
                image_url: item.image_url 
            }, 
            quantity: item.quantity 
        }));
        
        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        
        res.status(200).json({ items: cartItems, total });

    } catch (error) {
        console.error(`[Cart Router] Error updating quantity for User ID ${userId}, Product ID ${intProductId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error updating cart item quantity' });
    }
});

// Remove a specific item from the cart
router.delete('/items/:productId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.params;
    const intProductId = parseInt(productId, 10);
     if (isNaN(intProductId)) { return res.status(400).json({ error: 'Invalid Product ID format.' }); }
    console.log(`[Cart Router] User ID: ${userId} removing Product ID: ${intProductId}`);
    try {
        const query = 'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING *';
        const { rowCount } = await pool.query(query, [userId, intProductId]);
        if (rowCount === 0) { return res.status(404).json({ error: 'Cart item not found.' }); }
        console.log(`[Cart Router] Item removed for User ID: ${userId}, Product ID: ${intProductId}`);
        const getCartQuery = `
        SELECT ci.product_id, ci.quantity, p.name, p.price, p.image_url 
        FROM cart_items ci 
        JOIN products p ON ci.product_id = p.id 
        WHERE ci.user_id = $1 
        ORDER BY ci.added_at ASC;`;
        const cartResult = await pool.query(getCartQuery, [userId]);
        const cartItems = cartResult.rows.map(item => ({ 
            product: { 
                id: item.product_id, 
                name: item.name, 
                price: item.price, 
                image_url: item.image_url 
            },
            quantity: item.quantity 
        }));
        
        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        
        res.status(200).json({ items: cartItems, total });
    } catch (error) {
        console.error(`[Cart Router] Error removing item for User ID ${userId}, Product ID ${intProductId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error removing item from cart' });
    }
});

// Clear cart
router.delete('/', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    console.log(`[Cart Router] Clearing cart for user ID: ${userId}`);
    try {
        const query = 'DELETE FROM cart_items WHERE user_id = $1 RETURNING *';
        const { rowCount } = await pool.query(query, [userId]);
        console.log(`[Cart Router] Cleared ${rowCount} items for user ID: ${userId}`);
        res.status(200).json({ items: [], total: 0 }); // Return empty cart with total
    } catch (error) {
        console.error(`[Cart Router] Error clearing cart for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error clearing cart' });
    }
});

module.exports = router;
