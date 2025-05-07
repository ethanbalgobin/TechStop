const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

//Create New Order
router.post('/', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { shippingDetails, items, total, paymentIntentId } = req.body;

    console.log(`[Order Router] Attempting order creation for user ID: ${userId}, PaymentIntent: ${paymentIntentId}`);

    if (!shippingDetails || !items || !Array.isArray(items) || items.length === 0 || total === undefined || total === null || !paymentIntentId) {
        return res.status(400).json({ error: 'Invalid order data. Shipping details, items, total, and paymentIntentId are required.' });
    }
    const { fullName, address1, address2, city, postcode, country } = shippingDetails;
    if (!fullName || !address1 || !city || !postcode || !country) {
         return res.status(400).json({ error: 'Missing required shipping fields.' });
    }
     const numericTotal = Number(total);
     if (isNaN(numericTotal) || numericTotal < 0) {
         return res.status(400).json({ error: 'Invalid total amount.' });
     }

    const client = await pool.connect();
    console.log(`[Order Router] Database client acquired for user ID: ${userId}`);
    try {
        await client.query('BEGIN');
        console.log(`[Order Router] Transaction started for user ID: ${userId}`);

        let shippingAddressId;
        const findAddressQuery = `
        SELECT id FROM addresses 
        WHERE user_id = $1 AND address_line1 = $2 
        AND (address_line2 = $3 
        OR (address_line2 IS NULL AND $3 IS NULL)) 
        AND city = $4 AND postal_code = $5 
        AND country = $6 
        AND address_type = $7;`;
        const findAddressValues = [ userId, address1, address2 || null, city, postcode, country, 'shipping' ];
        const existingAddressResult = await client.query(findAddressQuery, findAddressValues);
        if (existingAddressResult.rows.length > 0) {
            shippingAddressId = existingAddressResult.rows[0].id;
            console.log(`[Order Router] Found existing shipping address ID: ${shippingAddressId}`);
        } else {
            const insertAddressQuery = `
            INSERT INTO addresses (user_id, address_line1, address_line2, city, state_province_region, postal_code, country, address_type) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id;`;
            const insertAddressValues = [ userId, address1, address2 || null, city, null, postcode, country, 'shipping' ];
            const newAddressResult = await client.query(insertAddressQuery, insertAddressValues);
            shippingAddressId = newAddressResult.rows[0].id;
            console.log(`[Order Router] New shipping address created ID: ${shippingAddressId}`);
        }

        const orderQuery = `INSERT INTO orders (user_id, total_amount, status, shipping_address_id, billing_address_id, payment_intent_id) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING id, order_date, status;`;
        const orderValues = [ userId, numericTotal, 'Pending', shippingAddressId, shippingAddressId, paymentIntentId ];
        const orderResult = await client.query(orderQuery, orderValues);
        const newOrder = orderResult.rows[0];
        const newOrderId = newOrder.id;
        console.log(`[Order Router] Order created ID: ${newOrderId} with PaymentIntent: ${paymentIntentId}`);

        const itemInsertQuery = `
        INSERT INTO order_items (order_id, product_id, quantity, price_per_unit) 
        VALUES ($1, $2, $3, $4);`;
        await Promise.all(items.map(item => {
            if (!item || !item.product || !item.product.id || !item.quantity || !item.product.price) {
                throw new Error('Invalid item data received in order.');
            }
            const itemValues = [ newOrderId, item.product.id, item.quantity, Number(item.product.price) ];
            return client.query(itemInsertQuery, itemValues);
        }));
        console.log(`[Order Router] All ${items.length} order items inserted for Order ID: ${newOrderId}`);

        const clearCartQuery = 'DELETE FROM cart_items WHERE user_id = $1';
        await client.query(clearCartQuery, [userId]);
        console.log(`[Order Router] Cart cleared for user ID: ${userId}`);

        await client.query('COMMIT');
        console.log(`[Order Router] Transaction committed for Order ID: ${newOrderId}`);

        res.status(201).json({
            message: 'Order placed successfully!',
            order: { id: newOrder.id, orderDate: newOrder.order_date, status: newOrder.status, totalAmount: numericTotal }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[Order Router] Transaction rolled back for user ID ${userId}. Error:`, error.stack);
        if (error.code === '23505' && error.constraint === 'orders_payment_intent_id_key') {
             return res.status(409).json({ error: 'Order potentially already created for this payment.' });
        }
        res.status(500).json({ error: 'Internal Server Error placing order.' });
    } finally {
        client.release();
        console.log(`[Order Router] Database client released for user ID: ${userId}`);
    }
});


// Get User's Order History
router.get('/', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    console.log(`[Order Router] Fetching order history for user ID: ${userId}`);
    try {
        const query = `
            SELECT id, order_date, total_amount, status, shipping_address_id, billing_address_id
            FROM orders WHERE user_id = $1 ORDER BY order_date DESC;
        `;
        const { rows } = await pool.query(query, [userId]);
        console.log(`[Order Router] Found ${rows.length} orders for user ID: ${userId}`);
        res.status(200).json(rows);
    } catch (error) {
        console.error(`[Order Router] Error fetching order history for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error fetching order history.' });
    }
});

// Get User's Single Order Detail
router.get('/:orderId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { orderId } = req.params;
    const intOrderId = parseInt(orderId, 10);
    if (isNaN(intOrderId)) {
        return res.status(400).json({ error: 'Invalid Order ID format.' });
    }
    console.log(`[Order Router] Fetching details for Order ID: ${intOrderId}, User ID: ${userId}`);
    try {
        const orderQuery = `SELECT o.* FROM orders o WHERE o.id = $1 AND o.user_id = $2;`;
        const orderResult = await pool.query(orderQuery, [intOrderId, userId]);
        if (orderResult.rows.length === 0) { return res.status(404).json({ error: 'Order not found.' }); }
        const orderDetails = orderResult.rows[0];

        const itemsQuery = `
        SELECT oi.*, p.name AS product_name, p.image_url AS product_image_url FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = $1 
        ORDER BY p.name ASC;`;
        const itemsResult = await pool.query(itemsQuery, [intOrderId]);
        const orderItems = itemsResult.rows.map(item => ({
            productId: item.product_id, quantity: item.quantity, pricePerUnit: item.price_per_unit,
            name: item.product_name, imageUrl: item.product_image_url
        }));

        // Fetch shipping address details
        let shippingAddress = null;
        if (orderDetails.shipping_address_id) {
            const addressQuery = `
            SELECT * FROM addresses 
            WHERE id = $1 AND user_id = $2;`;
            const addressResult = await pool.query(addressQuery, [orderDetails.shipping_address_id, userId]);
            if (addressResult.rows.length > 0) { shippingAddress = addressResult.rows[0]; }
        }
        const fullOrderDetails = { ...orderDetails, items: orderItems, shippingAddress: shippingAddress };
        res.status(200).json(fullOrderDetails);
    } catch (error) {
        console.error(`[Order Router] Error fetching details for Order ID ${intOrderId}, User ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error fetching order details.' });
    }
});

module.exports = router;
