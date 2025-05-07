const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const authenticateAdmin = require('../middleware/authenticateAdmin');


// --- Product Management ---

// View all products
router.get('/products', authenticateToken, authenticateAdmin, async (req, res) => {
    console.log(`[Admin Router GET /products] Fetch all products by admin user ID: ${req.user.userId}`);
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('[Admin Router GET /products] Error:', err.stack);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Add new product
router.post('/products', authenticateToken, authenticateAdmin, async (req, res) => {
    const { name, description, price, stock_quantity, image_url, category_id } = req.body;
    console.log(`[Admin Router POST /products] Add product: ${name} by admin user ID: ${req.user.userId}`);
    // Validation
    if (!name || !description || price === undefined || stock_quantity === undefined) { 
        return res.status(400).json({ error: 'Missing required fields.' }); 
    }
    const numericPrice = Number(price); 
    const intStockQuantity = parseInt(stock_quantity, 10);
    const intCategoryId = category_id ? parseInt(category_id, 10) : null;

    if (isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ error: 'Invalid price.' });
    }

    if (isNaN(intStockQuantity) || intStockQuantity < 0) {
        return res.status(400).json({ error: 'Invalid stock quantity.' }); 
    }

    if (category_id && (isNaN(intCategoryId) || intCategoryId <= 0) && intCategoryId !== null) {
        return res.status(400).json({ error: 'Invalid category ID.' }); 
    }
    try {
        const query = `
        INSERT INTO products (name, description, price, stock_quantity, image_url, category_id, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
        RETURNING *;
        `;
        const values = [name, description, numericPrice, intStockQuantity, image_url || null, intCategoryId];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('[Admin Router POST /products] Error:', err.stack);
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid category ID.' }); 
        }
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// Updating product
router.put('/products/:productId', authenticateToken, authenticateAdmin, async (req, res) => {
    const { productId } = req.params;
    const { name, description, price, stock_quantity, image_url, category_id } = req.body;
    console.log(`[Admin Router PUT /products/:productId] Update product ID: ${productId} by admin user ID: ${req.user.userId}`);
    const intProductId = parseInt(productId, 10);

    if (isNaN(intProductId)) { 
        return res.status(400).json({ error: 'Invalid Product ID.' }); 
    }
    const fieldsToUpdate = {};

    if (name !== undefined) fieldsToUpdate.name = name;

    if (description !== undefined) fieldsToUpdate.description = description;

    if (price !== undefined) {
         const n = Number(price); 
         if (isNaN(n) || n<0) 
            return res.status(400).json({ error: 'Invalid price.' }); 
        fieldsToUpdate.price = n; 
    }

    if (stock_quantity !== undefined) {
        const n = parseInt(stock_quantity, 10);
        if (isNaN(n) || n<0) 
            return res.status(400).json({ error: 'Invalid stock.' }); f
        fieldsToUpdate.stock_quantity = n; 
    }

    if (image_url !== undefined) fieldsToUpdate.image_url = image_url === '' ? null : image_url;

    if (category_id !== undefined) {
        if (category_id === null || category_id === '' || category_id === 0) {
            fieldsToUpdate.category_id = null; 
        } 
        else {
             const n = parseInt(category_id, 10); 
             if (isNaN(n) || n<=0) 
                return res.status(400).json({ error: 'Invalid category ID.' }); 
            fieldsToUpdate.category_id = n; 
        } 
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
        return res.status(400).json({ error: 'No fields provided for update.' }); 
    
    }

    fieldsToUpdate.updated_at = new Date();

    const setClauses = Object.keys(fieldsToUpdate).map((key, i) => `"${key}" = $${i + 1}`).join(', ');
    const values = Object.values(fieldsToUpdate); values.push(intProductId);
    try {
        const query = `
        UPDATE products 
        SET ${setClauses} 
        WHERE id = $${values.length} 
        RETURNING *;
        `;
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found.' }); 
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`[Admin Router PUT /products/:productId] Error updating product ID ${intProductId}:`, err.stack);

        if (err.code === '23503') {
            return res.status(400).json({ error: 'Invalid category ID.' }); 
        }
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// Delete a Product
router.delete('/products/:productId', authenticateToken, authenticateAdmin, async (req, res) => {
    const { productId } = req.params;
    console.log(`[Admin Router DELETE /products/:productId] Delete product ID: ${productId} by admin user ID: ${req.user.userId}`);
    const intProductId = parseInt(productId, 10);
    if (isNaN(intProductId)) { return res.status(400).json({ error: 'Invalid Product ID.' }); }
    try {
        const checkOrderItemsQuery = 'SELECT COUNT(*) FROM order_items WHERE product_id = $1';
        const orderItemsResult = await pool.query(checkOrderItemsQuery, [intProductId]);
        if (parseInt(orderItemsResult.rows[0].count, 10) > 0) {
            return res.status(409).json({ error: 'Cannot delete product. It is referenced in existing orders.' });
        }

        const query = 'DELETE FROM products WHERE id = $1 RETURNING *;';
        const result = await pool.query(query, [intProductId]);

        if (result.rows.length === 0) { 
            return res.status(404).json({ error: 'Product not found.' }); 
        }
        res.status(200).json({ message: 'Product deleted successfully.', product: result.rows[0] });
    } catch (err) {
        console.error(`[Admin Router DELETE /products/:productId] Error deleting product ID ${intProductId}:`, err.stack);
        if (err.code === '23503') { 
            return res.status(409).json({ error: 'Cannot delete product. It is referenced elsewhere.' }); 
        }
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// --- Category Management ---

// View all categories
router.get('/categories', authenticateToken, authenticateAdmin, async (req, res) => {
    console.log(`[Admin Router GET /categories] Fetch all categories by admin user ID: ${req.user.userId}`);
    try {
        const result = await pool.query('SELECT id, name, description FROM categories ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('[Admin Router GET /categories] Error:', err.stack);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// Add new category
router.post('/categories', authenticateToken, authenticateAdmin, async (req, res) => {
    const { name, description } = req.body;
    console.log(`[Admin Router POST /categories] Create category: ${name} by admin user ID: ${req.user.userId}`);

    if (!name) { 
        return res.status(400).json({ error: 'Category name is required.' }); 
    }
    try {
        const query = `
            INSERT INTO categories (name, description, created_at, updated_at) 
            VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
            RETURNING *;
        `;
        const values = [name, description || null];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('[Admin Router POST /categories] Error:', err.stack);

        if (err.code === '23505') { 
            return res.status(409).json({ error: 'Category name already exists.' }); 
        }
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// Upate a category
router.put('/categories/:categoryId', authenticateToken, authenticateAdmin, async (req, res) => {
    const { categoryId } = req.params;
    const { name, description } = req.body;
    console.log(`[Admin Router PUT /categories] Update category ID: ${categoryId} by admin user ID: ${req.user.userId}`);
    const intCategoryId = parseInt(categoryId, 10);

    if (isNaN(intCategoryId)) { 
        return res.status(400).json({ error: 'Invalid Category ID.' }); 
    }
    if (name === undefined && description === undefined) {
        return res.status(400).json({ error: 'No fields provided for update.' }); 
    }
    const fieldsToUpdate = {};

    if (name !== undefined) fieldsToUpdate.name = name;

    if (description !== undefined) fieldsToUpdate.description = description === '' ? null : description;

    if (Object.keys(fieldsToUpdate).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided.' }); 
    }

    fieldsToUpdate.updated_at = new Date();
    const setClauses = Object.keys(fieldsToUpdate).map((key, i) => `"${key}" = $${i + 1}`).join(', ');
    const values = Object.values(fieldsToUpdate); values.push(intCategoryId);
    try {
        const query = `
            UPDATE categories 
            SET ${setClauses} 
            WHERE id = $${values.length} 
            RETURNING *;
        `;

        const result = await pool.query(query, values);
        if (result.rows.length === 0) { return res.status(404).json({ error: 'Category not found.' }); }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`[Admin Router PUT /categories] Error updating category ID ${intCategoryId}:`, err.stack);
        if (err.code === '23505') { 
            return res.status(409).json({ error: 'Category name already exists.' }); 
        }
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// Delete a category
router.delete('/categories/:categoryId', authenticateToken, authenticateAdmin, async (req, res) => {
    const { categoryId } = req.params;
    console.log(`[Admin Router DELETE /categories] Delete category ID: ${categoryId} by admin user ID: ${req.user.userId}`);
    const intCategoryId = parseInt(categoryId, 10);
    if (isNaN(intCategoryId)) { return res.status(400).json({ error: 'Invalid Category ID.' }); }
    try {
        const query = 'DELETE FROM categories WHERE id = $1 RETURNING *;';
        const result = await pool.query(query, [intCategoryId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found.' }); 
        }
        res.status(200).json({ message: 'Category deleted successfully.', category: result.rows[0] });
    } catch (err) {
        console.error(`[Admin Router DELETE /categories] Error deleting category ID ${intCategoryId}:`, err.stack);

        if (err.code === '23503') {
            return res.status(409).json({ error: 'Cannot delete category. It is assigned to products.' }); 
        }
        
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// --- Order Management ---

// View all orders
router.get('/orders', authenticateToken, authenticateAdmin, async (req, res) => {
    console.log(`[Admin Router GET /orders] Fetch all orders by admin user ID: ${req.user.userId}`);
    try {
        const query = `
            SELECT o.id AS order_id, o.order_date, o.total_amount, 
                o.status, o.shipping_address_id, o.billing_address_id, o.payment_intent_id, u.id 
            AS user_id, 
            u.username AS user_username, u.email AS user_email 
            FROM orders o 
            JOIN users u 
            ON o.user_id = u.id 
            ORDER BY o.order_date DESC;
        `;
        const { rows } = await pool.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('[Admin Router GET /orders] Error:', error.stack);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// View specific order
router.get('/orders/:orderId', authenticateToken, authenticateAdmin, async (req, res) => {
    const { orderId } = req.params; const adminUserId = req.user.userId;
    const intOrderId = parseInt(orderId, 10);
    if (isNaN(intOrderId)) { return res.status(400).json({ error: 'Invalid Order ID.' }); }
    console.log(`[Admin Router GET /orders/:orderId] Admin User ID: ${adminUserId} fetching details for Order ID: ${intOrderId}`);
    try {
        const orderQuery = `
            SELECT o.id AS order_id, o.*, u.username 
            AS customer_username, 
            u.email AS customer_email 
            FROM orders o 
            JOIN users u 
            ON o.user_id = u.id 
            WHERE o.id = $1;
        `;

        const orderResult = await pool.query(orderQuery, [intOrderId]);
        if (orderResult.rows.length === 0) { return res.status(404).json({ error: 'Order not found.' }); }
        const orderDetails = orderResult.rows[0];
        const itemsQuery = `
                SELECT oi.*, p.name AS product_name, 
                p.image_url AS product_image_url 
                FROM order_items oi 
                JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = $1 
                ORDER BY p.name ASC;
            `;
        const itemsResult = await pool.query(itemsQuery, [intOrderId]);
        const orderItems = itemsResult.rows.map(item => ({ 
            productId: item.product_id, 
            quantity: item.quantity, 
            pricePerUnit: item.price_per_unit, 
            name: item.product_name, 
            imageUrl: item.product_image_url 
        }));
        let shippingAddress = null;
        if (orderDetails.shipping_address_id) {
            const addressQuery = `SELECT * FROM addresses WHERE id = $1;`;
            const addressResult = await pool.query(addressQuery, [orderDetails.shipping_address_id]);
            if (addressResult.rows.length > 0) { shippingAddress = addressResult.rows[0]; }
        }
        const fullOrderDetails = { ...orderDetails, items: orderItems, shippingAddress: shippingAddress };
        res.status(200).json(fullOrderDetails);
    } catch (error) {
        console.error(`[Admin Router GET /orders/:orderId] Error fetching details for Order ID ${intOrderId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// Update orders
router.put('/orders/:orderId/status', authenticateToken, authenticateAdmin, async (req, res) => {
    const { orderId } = req.params; const { status } = req.body; const adminUserId = req.user.userId;
    const intOrderId = parseInt(orderId, 10);

    if (isNaN(intOrderId)) { 
        return res.status(400).json({ error: 'Invalid Order ID.' }); 
    }

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];

    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` }); 
    }

    console.log(`[Admin Router PUT /orders/:orderId/status] Admin User ID: ${adminUserId} updating status for Order ID: ${intOrderId} to "${status}"`);

    try {
        const updateQuery = `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;`;
        const { rows, rowCount } = await pool.query(updateQuery, [status, intOrderId]);
        if (rowCount === 0) { return res.status(404).json({ error: 'Order not found.' }); }
        console.log(`[Admin Router PUT /orders/:orderId/status] Order ID: ${intOrderId} status updated to "${rows[0].status}"`);
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(`[Admin Router PUT /orders/:orderId/status] Error updating status for Order ID ${intOrderId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// --- User Management ---

// View all users
router.get('/users', authenticateToken, authenticateAdmin, async (req, res) => {
    const adminUserId = req.user.userId;
    console.log(`[Admin Router GET /users] Admin User ID: ${adminUserId} fetching all users.`);
    try {
        const query = `
            SELECT id, username, email, first_name, last_name, is_admin, is_2fa_enabled, created_at, updated_at 
            FROM users ORDER BY id ASC;
        `;

        const { rows } = await pool.query(query);
        res.status(200).json(rows);
    } catch (error) {
        console.error('[Admin Router GET /users] Error fetching all users for admin:', error.stack);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// Set user as an admin
router.put('/users/:targetUserId/role', authenticateToken, authenticateAdmin, async (req, res) => {
    const { targetUserId } = req.params; const { isAdmin } = req.body; const adminPerformingActionId = req.user.userId;
    const intTargetUserId = parseInt(targetUserId, 10);

    if (isNaN(intTargetUserId)) {
         return res.status(400).json({ error: 'Invalid Target User ID.' }); 
        }

    if (typeof isAdmin !== 'boolean') {
        return res.status(400).json({ error: 'isAdmin status is required.' }); 
    }

    if (intTargetUserId === adminPerformingActionId) {
        return res.status(403).json({ error: 'Cannot change own role.' }); 
    }

    try {
        const userCheckQuery = 'SELECT id FROM users WHERE id = $1';
        const userCheckResult = await pool.query(userCheckQuery, [intTargetUserId]);

        if (userCheckResult.rows.length === 0) {
            return res.status(404).json({ error: 'Target user not found.' });
        }
        const updateQuery = `
            UPDATE users 
            SET is_admin = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2 
            RETURNING id, username, email, first_name, last_name, is_admin, is_2fa_enabled, created_at, updated_at;
        `;
        const { rows, rowCount } = await pool.query(updateQuery, [isAdmin, intTargetUserId]);
        if (rowCount === 0) { return res.status(404).json({ error: 'User not found during update.' }); }
        console.log(`[Admin Router PUT /users/:targetUserId/role] User ID: ${intTargetUserId} admin status updated to ${rows[0].is_admin}`);
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(`[Admin Router PUT /users/:targetUserId/role] Error updating role for User ID ${intTargetUserId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

module.exports = router;
