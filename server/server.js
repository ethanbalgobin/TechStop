const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const pool = require('./db'); 
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 
const app = express();
const PORT = process.env.PORT || 5001;
const saltRounds = 10;
const authenticateToken = require('./middleware/authenticateToken');

//Middleware

app.use(cors());

// === Admin Authentication Middleware ===
const authenticateAdmin = async (req, res, next) => {
    if (!req.user || !req.user.userId) {
        console.warn('[Admin Middleware] No user found on request. Ensure authenticateToken runs first.');
        return res.status(401).json({ error: 'Authentication required.' });
    }

    const userId = req.user.userId;
    console.log(`[Admin Middleware] Checking admin status for user ID: ${userId}`);

    try {
        const userQuery = 'SELECT is_admin FROM users WHERE id = $1';
        const { rows } = await pool.query(userQuery, [userId]);

        if (rows.length === 0) {
            console.warn(`[Admin Middleware] User ID ${userId} not found in database despite valid token.`);
            return res.status(403).json({ error: 'Forbidden: User not found.' });
        }

        const user = rows[0];
        if (user.is_admin === true) {
            console.log(`[Admin Middleware] User ID ${userId} is an admin. Access granted.`);
            next();
        } else {
            console.log(`[Admin Middleware] User ID ${userId} is NOT an admin. Access denied.`);
            return res.status(403).json({ error: 'Forbidden: Administrator access required.' });
        }
    } catch (error) {
        console.error(`[Admin Middleware] Error checking admin status for user ID ${userId}:`, error.stack);
        return res.status(500).json({ error: 'Internal Server Error checking admin privileges.' });
    }
};

// --- API Routes ---

// === Stripe Webhook Endpoint ===
app.post('/api/stripe-webhooks', express.raw({type: 'application/json'}), async (req, res) => {
    console.log('[Webhook] Received event.');

    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !endpointSecret) {
        console.error('[Webhook] Error: Missing stripe-signature header or webhook secret.');
        return res.status(400).send('Webhook Error: Configuration issue.');
    }

    let event;

    try {
        // Verify signature
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        console.log('[Webhook] Signature verified. Event type:', event.type);
    } catch (err) {
        console.error(`[Webhook] ❌ Error verifying webhook signature: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntentSucceeded = event.data.object;
            const paymentIntentId = paymentIntentSucceeded.id;
            console.log(`[Webhook] PaymentIntent succeeded: ${paymentIntentId}`);
            try {
                const updateOrderQuery = `
                    UPDATE orders
                    SET status = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE payment_intent_id = $2 AND status = 'Pending' -- Only update if still pending
                    RETURNING id, user_id, status; -- Return updated order info
                `;
                const newStatus = 'Paid';
                const { rows, rowCount } = await pool.query(updateOrderQuery, [newStatus, paymentIntentId]);

                if (rowCount > 0) {
                    const updatedOrder = rows[0];
                    console.log(`[Webhook] Order ID ${updatedOrder.id} status updated to '${updatedOrder.status}' for PaymentIntent ${paymentIntentId}`);
                    // TODO: Trigger other fulfillment actions here (e.g., send confirmation email)
                } else {
                    console.warn(`[Webhook] No pending order found or already processed for PaymentIntent ${paymentIntentId}.`);
                }

            } catch (dbError) {
                console.error(`[Webhook] ❌ Database error handling PaymentIntent ${paymentIntentId}:`, dbError.stack);
                return res.status(500).send('Webhook Error: Database update failed.');
            }
            break;

        case 'payment_intent.payment_failed':
            const paymentIntentFailed = event.data.object;
            console.log(`[Webhook] PaymentIntent failed: ${paymentIntentFailed.id}`, paymentIntentFailed.last_payment_error?.message);
            break;

        default:
            console.log(`[Webhook] Unhandled event type ${event.type}`);
    }
    res.status(200).json({ received: true });
});

app.use(express.json()); 

// === Order Creation API Route ===

app.post('/api/orders', authenticateToken, async (req, res) => {
    const userId = req.user.userId; 
    const { shippingDetails, items, total, paymentIntentId } = req.body;

    console.log(`[API POST /api/orders] Attempting order creation for user ID: ${userId}, PayemntIntend: ${paymentIntentId}`);

    // Basic Validation
    if (!shippingDetails || !items || !Array.isArray(items) || items.length === 0 || total === undefined || total === null || !paymentIntentId) {
        console.error(`[API POST /api/orders] Invalid order data received for user ID: ${userId}`, req.body);
        return res.status(400).json({ error: 'Invalid order data. Shipping details, items, total, and paymentIntentId are required.' });
    }
    // Validate shipping details object
    const { fullName, address1, address2, city, postcode, country } = shippingDetails;
    if (!fullName || !address1 || !city || !postcode || !country) {
         return res.status(400).json({ error: 'Missing required shipping fields (Full Name, Address Line 1, City, Postcode, Country).' });
    }
     const numericTotal = Number(total);
     if (isNaN(numericTotal) || numericTotal < 0) {
         return res.status(400).json({ error: 'Invalid total amount.' });
     }
    // --- End Validation ---


    // --- Database Transaction ---
    const client = await pool.connect();
    console.log(`[API POST /api/orders] Database client acquired for user ID: ${userId}`);

    try {
        await client.query('BEGIN');
        console.log(`[API POST /api/orders] Transaction started for user ID: ${userId}`);
        let shippingAddressId;
        const findAddressQuery = `
            SELECT id FROM addresses
            WHERE user_id = $1           -- Param $1
              AND address_line1 = $2     -- Param $2
              AND (address_line2 = $3 OR (address_line2 IS NULL AND $3 IS NULL)) -- Param $3
              AND city = $4              -- Param $4
              AND postal_code = $5       -- Param $5 (was $6)
              AND country = $6           -- Param $6 (was $7)
              AND address_type = $7;     -- Param $7 (was $8)
        `;
        const findAddressValues = [
            userId,                     // $1
            shippingDetails.address1,   // $2
            shippingDetails.address2 || null, // $3
            shippingDetails.city,       // $4
            shippingDetails.postcode,   // $5 
            shippingDetails.country,    // $6 
            'shipping'                  // $7 
        ];
        const existingAddressResult = await client.query(findAddressQuery, findAddressValues);

        if (existingAddressResult.rows.length > 0) {
            shippingAddressId = existingAddressResult.rows[0].id;
            console.log(`[API POST /api/orders] Found existing shipping address with ID: ${shippingAddressId} for user ID: ${userId}`);
        } else {
            console.log(`[API POST /api/orders] No identical shipping address found. Inserting new address for user ID: ${userId}`);
            const insertAddressQuery = `
                INSERT INTO addresses (user_id, address_line1, address_line2, city, state_province_region, postal_code, country, address_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id;
            `;
            const insertAddressValues = [
                userId,
                shippingDetails.address1,
                shippingDetails.address2 || null,
                shippingDetails.city,
                null,
                shippingDetails.postcode,
                shippingDetails.country,
                'shipping'
            ];
            const newAddressResult = await client.query(insertAddressQuery, insertAddressValues);
            shippingAddressId = newAddressResult.rows[0].id;
            console.log(`[API POST /api/orders] New shipping address created with ID: ${shippingAddressId} for user ID: ${userId}`);
        }
        // --- END MODIFIED ADDRESS HANDLING ---


        // 2. Insert Order into 'orders' table
        const orderQuery = `
            INSERT INTO orders (user_id, total_amount, status, shipping_address_id, billing_address_id, payment_intent_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, order_date, status;
        `;
        const orderValues = [ userId, numericTotal, 'Pending', shippingAddressId, shippingAddressId, paymentIntentId ];
        const orderResult = await client.query(orderQuery, orderValues);
        const newOrder = orderResult.rows[0];
        const newOrderId = newOrder.id;
        console.log(`[API POST /api/orders] Order created with ID: ${newOrderId} for user ID: ${userId}. PaymentIntent: ${paymentIntentId}`);

        const itemInsertQuery = `
            INSERT INTO order_items (order_id, product_id, quantity, price_per_unit)
            VALUES ($1, $2, $3, $4);
        `;
        await Promise.all(items.map(item => {
            if (!item || !item.product || !item.product.id || !item.quantity || !item.product.price) {
                console.error(`[API POST /api/orders] Invalid item structure in order for Order ID: ${newOrderId}`, item);
                throw new Error('Invalid item data received in order.');
            }
            const itemValues = [ newOrderId, item.product.id, item.quantity, Number(item.product.price) ];
            console.log(`[API POST /api/orders] Inserting order item for Order ID: ${newOrderId}, Product ID: ${item.product.id}`);
            return client.query(itemInsertQuery, itemValues);
        }));
        console.log(`[API POST /api/orders] All ${items.length} order items inserted for Order ID: ${newOrderId}`);

        // 4. Clear the user's cart
        const clearCartQuery = 'DELETE FROM cart_items WHERE user_id = $1';
        await client.query(clearCartQuery, [userId]);
        console.log(`[API POST /api/orders] Cart cleared for user ID: ${userId}`);

        await client.query('COMMIT');
        console.log(`[API POST /api/orders] Transaction committed for Order ID: ${newOrderId}`);

        res.status(201).json({
            message: 'Order placed successfully!',
            order: { id: newOrder.id, orderDate: newOrder.order_date, status: newOrder.status, totalAmount: numericTotal }
        });

    } catch (error) {
        // Rollback and error handling
        await client.query('ROLLBACK');
        console.error(`[API POST /api/orders] Transaction rolled back for user ID ${userId}. Error:`, error.stack);
        // Check for unique constraint violation on payment_intent_id
        if (error.code === '23505' && error.constraint === 'orders_payment_intent_id_key') {
            return res.status(409).json({ error: 'Order potentially already created for this payment.' });
       }
        res.status(500).json({ error: 'Internal Server Error placing order.' });
    } finally {
        // Release client
        client.release();
        console.log(`[API POST /api/orders] Database client released for user ID: ${userId}`);
    }
});

// === Order History API Route ===

app.get('/api/orders', authenticateToken, async (req, res) => {
    const userId = req.user.userId; 
    console.log(`[API GET /api/orders] Fetching order history for user ID: ${userId}`);

    try {
        const query = `
            SELECT
                id,
                order_date,
                total_amount,
                status,
                shipping_address_id,
                billing_address_id
            FROM orders
            WHERE user_id = $1
            ORDER BY order_date DESC;
        `;
        const { rows } = await pool.query(query, [userId]);

        console.log(`[API GET /api/orders] Found ${rows.length} orders for user ID: ${userId}`);
        res.status(200).json(rows);

    } catch (error) {
        console.error(`[API GET /api/orders] Error fetching order history for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error fetching order history.' });
    }
});

app.get('/api/cart', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    console.log(`[API GET /api/cart] Fetching cart for user ID ${userId}`);

    try {
        const query = `
            SELECT
                ci.product_id,
                ci.quantity,
                ci.added_at,
                ci.updated_at,
                p.name,
                p.price,
                p.image_url
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = $1
            ORDER BY ci_added ASC;
        `;
        const { rows } = await pool.query(query, [userId]);

        const cartItems = rows.map(item => ({
            product: {
                id: item.product_id,
                name: item.name,
                price: item.price,
                image_url: item.image_url
            },
            quantity: item.quantity,
        }));

        console.log(`[API GET /api/cart] Found ${cartItems.length} items for user ID ${userId}`);
        res.status(200).json(cartItems);

    } catch (error) {
        console.error(`[API GET /api/cart] Error fetching cart for user ID ${userId}:`, error.stack);
        res.status(500).json({error: 'Internal Server Error fetching cart'});
    }
});

// === Fetch Single Order Details API Route ===

app.get('/api/orders/:orderId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { orderId } = req.params; 

    const intOrderId = parseInt(orderId, 10);
    if (isNaN(intOrderId)) {
        return res.status(400).json({ error: 'Invalid Order ID format.' });
    }

    console.log(`[API GET /api/orders/:orderId] Fetching details for Order ID: ${intOrderId}, User ID: ${userId}`);

    try {
        const orderQuery = `
            SELECT
                o.id,
                o.order_date,
                o.total_amount,
                o.status,
                o.shipping_address_id,
                o.billing_address_id -- Keep this if you might use it later
                -- Select other order fields if needed
            FROM orders o
            WHERE o.id = $1 AND o.user_id = $2;
        `;
        const orderResult = await pool.query(orderQuery, [intOrderId, userId]);

        // Check if order exists and belongs to the user
        if (orderResult.rows.length === 0) {
            console.log(`[API GET /api/orders/:orderId] Order ID: ${intOrderId} not found for User ID: ${userId}`);
            return res.status(404).json({ error: 'Order not found.' });
        }
        const orderDetails = orderResult.rows[0];
        const itemsQuery = `
            SELECT
                oi.product_id,
                oi.quantity,
                oi.price_per_unit, -- Price at the time of order
                p.name AS product_name,
                p.image_url AS product_image_url
                -- Select other product details if needed
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
            ORDER BY p.name ASC; -- Or order by item ID
        `;
        const itemsResult = await pool.query(itemsQuery, [intOrderId]);
        const orderItems = itemsResult.rows.map(item => ({
            productId: item.product_id,
            quantity: item.quantity,
            pricePerUnit: item.price_per_unit, 
            name: item.product_name,
            imageUrl: item.product_image_url
        }));
        console.log(`[API GET /api/orders/:orderId] Found ${orderItems.length} items for Order ID: ${intOrderId}`);

        let shippingAddress = null;
        if (orderDetails.shipping_address_id) {
            const addressQuery = `
                SELECT
                    address_line1,
                    address_line2,
                    city,
                    state_province_region,
                    postal_code,
                    country
                FROM addresses
                WHERE id = $1 AND user_id = $2; -- Ensure address also belongs to user
            `;
            const addressResult = await pool.query(addressQuery, [orderDetails.shipping_address_id, userId]);
            if (addressResult.rows.length > 0) {
                shippingAddress = addressResult.rows[0];
                console.log(`[API GET /api/orders/:orderId] Found shipping address for Order ID: ${intOrderId}`);
            } else {
                 console.warn(`[API GET /api/orders/:orderId] Shipping address ID ${orderDetails.shipping_address_id} not found or doesn't belong to user ID ${userId} for Order ID: ${intOrderId}`);
            }
        } else {
             console.log(`[API GET /api/orders/:orderId] No shipping address ID associated with Order ID: ${intOrderId}`);
        }

        const fullOrderDetails = {
            ...orderDetails,
            items: orderItems,
            shippingAddress: shippingAddress
        };

        res.status(200).json(fullOrderDetails);

    } catch (error) {
        console.error(`[API GET /api/orders/:orderId] Error fetching details for Order ID ${intOrderId}, User ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error fetching order details.' });
    }
});


app.post('/api/cart/items', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId, quantity } = req.body;

    // Basic validation
    if (!productId || quantity === undefined || quantity === null) {
        return res.status(400).json({ error: 'Product ID and quantity are required.' });
    }
    const intQuantity = parseInt(quantity, 10);
    if (isNaN(intQuantity) || intQuantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be a positive integer.' });
    }

    console.log(`[API POST /api/cart/items] User ID: ${userId} adding/updating Product ID: ${productId} with Quantity: ${intQuantity}`);

    try {
        const query = `
            INSERT INTO cart_items (user_id, product_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, product_id)
            DO UPDATE SET
                quantity = cart_items.quantity + $3, -- Increment quantity
                updated_at = CURRENT_TIMESTAMP      -- Update timestamp
            RETURNING *; -- Return the added/updated row
        `;
        const { rows } = await pool.query(query, [userId, productId, intQuantity]);
        const addedOrUpdatedItem = rows[0];

        console.log(`[API POST /api/cart/items] Item added/updated for User ID: ${userId}, Product ID: ${productId}`);

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

        res.status(201).json(cartItems); // Return the full updated cart

    } catch (error) {
        console.error(`[API POST /api/cart/items] Error for User ID ${userId}, Product ID ${productId}:`, error.stack);
        if (error.code === '23503') { // Foreign key violation
             return res.status(404).json({ error: 'Product not found.' });
        }
        res.status(500).json({ error: 'Internal Server Error adding item to cart' });
    }
});

// Update quantity of a specific item
app.put('/api/cart/items/:productId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.params; 
    const { quantity } = req.body;

    // Basic validation
    if (quantity === undefined || quantity === null) {
        return res.status(400).json({ error: 'Quantity is required.' });
    }
    const intProductId = parseInt(productId, 10);
    const intQuantity = parseInt(quantity, 10);
    if (isNaN(intProductId)) {
         return res.status(400).json({ error: 'Invalid Product ID format.' });
    }
    if (isNaN(intQuantity) || intQuantity <= 0) {
        console.log(`[API PUT /api/cart/items] User ID: ${userId} requested quantity <= 0 for Product ID: ${intProductId}. Removing item.`);
        try {
            const deleteQuery = 'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING *';
            const { rowCount } = await pool.query(deleteQuery, [userId, intProductId]);
             if (rowCount === 0) {
                 return res.status(404).json({ error: 'Cart item not found to remove.' });
             }
             const getCartQuery = `
             SELECT ci.product_id, ci.quantity, p.name, p.price, p.image_url 
             FROM cart_items ci 
             JOIN products p ON ci.product_id = p.id 
             WHERE ci.user_id = $1 
             ORDER BY ci.added_at ASC;`;
             const cartResult = await pool.query(getCartQuery, [userId]);
             const cartItems = cartResult.rows.map(item => ({ product: { id: item.product_id, name: item.name, price: item.price, image_url: item.image_url }, quantity: item.quantity }));
             return res.status(200).json(cartItems);

        } catch (error) {
             console.error(`[API PUT /api/cart/items] Error removing item for User ID ${userId}, Product ID ${intProductId}:`, error.stack);
             return res.status(500).json({ error: 'Internal Server Error removing item from cart' });
        }
    }

    try {
        const query = `
            UPDATE cart_items
            SET quantity = $1, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2 AND product_id = $3
            RETURNING *; -- Return the updated row
        `;
        const { rows, rowCount } = await pool.query(query, [intQuantity, userId, intProductId]);

        if (rowCount === 0) {
            console.log(`[API PUT /api/cart/items] Cart item not found for User ID: ${userId}, Product ID: ${intProductId}`);
            return res.status(404).json({ error: 'Cart item not found.' });
        }

        console.log(`[API PUT /api/cart/items] Quantity updated for User ID: ${userId}, Product ID: ${intProductId}`);

        const getCartQuery = `
        SELECT ci.product_id, ci.quantity, p.name, p.price, p.image_url 
        FROM cart_items ci 
        JOIN products p ON ci.product_id = p.id 
        WHERE ci.user_id = $1 
        ORDER BY ci.added_at ASC;`;
        const cartResult = await pool.query(getCartQuery, [userId]);
        const cartItems = cartResult.rows.map(item => ({ product: { id: item.product_id, name: item.name, price: item.price, image_url: item.image_url }, quantity: item.quantity }));
        res.status(200).json(cartItems);

    } catch (error) {
        console.error(`[API PUT /api/cart/items] Error updating quantity for User ID ${userId}, Product ID ${intProductId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error updating cart item quantity' });
    }
});

// Remove a specific item from the cart
app.delete('/api/cart/items/:productId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.params; // Get product ID from URL parameter

    const intProductId = parseInt(productId, 10);
     if (isNaN(intProductId)) {
         return res.status(400).json({ error: 'Invalid Product ID format.' });
    }

    console.log(`[API DELETE /api/cart/items] User ID: ${userId} removing Product ID: ${intProductId}`);

    try {
        const query = 'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING *';
        const { rowCount } = await pool.query(query, [userId, intProductId]);

        if (rowCount === 0) {
            console.log(`[API DELETE /api/cart/items] Cart item not found for User ID: ${userId}, Product ID: ${intProductId}`);
            return res.status(404).json({ error: 'Cart item not found.' });
        }

        console.log(`[API DELETE /api/cart/items] Item removed for User ID: ${userId}, Product ID: ${intProductId}`);
        const getCartQuery = `SELECT ci.product_id, ci.quantity, p.name, p.price, p.image_url FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = $1 ORDER BY ci.added_at ASC;`;
        const cartResult = await pool.query(getCartQuery, [userId]);
        const cartItems = cartResult.rows.map(item => ({ product: { id: item.product_id, name: item.name, price: item.price, image_url: item.image_url }, quantity: item.quantity }));
        res.status(200).json(cartItems); // Return the updated cart (now without the item)

    } catch (error) {
        console.error(`[API DELETE /api/cart/items] Error removing item for User ID ${userId}, Product ID ${intProductId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error removing item from cart' });
    }
});

// DELETE /api/cart - Clear the entire cart for the logged-in user
app.delete('/api/cart', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    console.log(`[API DELETE /api/cart] Clearing cart for user ID: ${userId}`);

    try {
        const query = 'DELETE FROM cart_items WHERE user_id = $1 RETURNING *';
        const { rowCount } = await pool.query(query, [userId]);

        console.log(`[API DELETE /api/cart] Cleared ${rowCount} items for user ID: ${userId}`);
        res.status(200).json([]);

    } catch (error) {
        console.error(`[API DELETE /api/cart] Error clearing cart for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error clearing cart' });
    }
});

// == API Endpoint to get all products (Using pool directly) ==
app.get('/api/products', async (req, res) => {
  console.log('Received request for /api/products');
  try {
    if (!pool || typeof pool.query !== 'function') {
       console.error('--- FATAL: Database pool or pool.query is not available! ---', pool);
       return res.status(500).json({ error: 'Database connection not initialized correctly.' });
    }
    const result = await pool.query('SELECT id, name, price, image_url FROM products ORDER BY name ASC');

    console.log(`Found ${result.rows.length} products`);
    res.json(result.rows);

  } catch (err) {
    console.error('Error during /api/products query execution:', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API endpoint to get a single product by ID
app.get('/api/products/:id', async (req, res) => {
    const productID = parseInt(req.params.id, 10);
    console.log(`Received request for /api/products/${productID}`);

    if (isNaN(productID)) {
        return res.status(400).json({error: 'Invalid product ID format'});
    }

    try {
        if (!pool || typeof pool.query !== 'function') {
            console.error('--- FATAL: Database pool or pool.query is not available! ---', pool);
            return res.status(500).json({error: 'Database connection not initialized correctly.'});
        }

        // SQL parameterized query to select product by ID
        const queryText = 'SELECT * FROM products WHERE id = $1';
        const values = [productID];
        const result = await pool.query(queryText, values);

        if(result.rows.length === 0) {
            // no product found, send 404
            console.log(`Product with ID ${productID} not found`);
            return res.status(404).json({error: 'Product not found.'});
        }

        console.log(`Found product with ID ${productID}: ${result.rows[0].name}`);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`Error during /api/products/${productID} query execution:`, err.stack);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

// === Authentication Routes ===

// --- Registration ---
app.post('/api/auth/register', async (req, res) => {
    const {username, email, password, first_name, last_name} = req.body;
    console.log('Registration attempt for:', email);

    if (!username || !email || !password) {
        return res.status(400).json({error: 'Username, email and password are required.'});
    }

    try {
        // 1. Hash password using bcrypt
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log('Password hashed for:', email);

        // 2. Insert the user into the database
        const insertQuery = `
            INSERT INTO users (username, email, password_hash, first_name, last_name)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, email;
        `;
        const values = [username, email, hashedPassword, first_name, last_name];

        const result = await pool.query(insertQuery, values);
        const newUser = result.rows[0];
        console.log('User registered successfully', newUser.email);

        // 3. Return the user info 
        res.status(201).json({
            message: 'User registered successfully!',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch(err) {
        if(err.code === '23505') {
            console.error('Registration Error: Username or email already exists. Please log in.', err.detail);
            return res.status(409).json({error: 'Username or email already exists.'}); // 409 Conflict
        }
        // Database or hashing errors
        console.error('Error during registration:', err.stack);
        res.status(500).json({error: 'Internal Server Error during registration'});
    }
});

// --- Login ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('[API POST /login] Login attempt for:', email);

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const queryText = 'SELECT id, username, email, password_hash, is_2fa_enabled FROM users WHERE email = $1';
        const values = [email];
        const result = await pool.query(queryText, values);

        if (result.rows.length === 0) {
            console.log('[API POST /login] Login failed: User not found for email:', email);
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.log('[API POST /login] Login failed: Incorrect password for email:', email);
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        if (user.is_2fa_enabled) {
            console.log(`[API POST /login] 2FA required for user ID: ${user.id}`);
            res.status(200).json({
                requires2FA: true,
                userId: user.id, // Send userId and email to frontend to use in the next step
                email: user.email 
            });
        } else {
            console.log(`[API POST /login] Login successful (2FA not enabled) for user ID: ${user.id}`);
            const payload = { userId: user.id, username: user.username };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

            res.status(200).json({
                message: 'Login Successful!',
                token: token,
                user: { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin, is_2fa_enabled: user.is_2fa_enabled}
            });
        }

    } catch (err) {
        console.error('[API POST /login] Error during login:', err.stack);
        res.status(500).json({ error: 'Internal Server Error during login.' });
    }
});

// Protected: Get current user's info
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    console.log('Accessing /api/auth/me for user ID:', req.user.userId);
    const { userId } = req.user;

    try {
        const getUserQuery = 'SELECT id, username, email, first_name, last_name, is_2fa_enabled, is_admin FROM users WHERE id = $1';
        const { rows } = await pool.query(getUserQuery, [userId]);
        const userFromDb = rows[0];

        if (!userFromDb) {
            console.warn(`User with ID ${userId} from token not found in database.`);
            return res.status(404).json({ message: "User associated with token not found" });
        }
        res.status(200).json({
            id: userFromDb.id,
            username: userFromDb.username,
            email: userFromDb.email,
            first_name: userFromDb.first_name,
            last_name: userFromDb.last_name,
            is_2fa_enabled: userFromDb.is_2fa_enabled,
            is_admin: userFromDb.is_admin
        });

    } catch (error) {
        console.error('Error fetching user details for /api/auth/me route:', error.stack);
        res.status(500).json({ message: 'Internal server error fetching user details' });
    }
});

// Payment Intent API Route
app.post('/api/create-payment-intent', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    let calculatedAmount = 0;
    try {
        console.log(`[API POST /create-payment-intent] Calculating total for user ID: ${userId}`);
        const cartQuery = `
            SELECT ci.quantity, p.price
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = $1;
        `;
        const { rows: cartItems } = await pool.query(cartQuery, [userId]);

        if (cartItems.length === 0) {
             return res.status(400).json({ error: 'Cannot create payment intent for empty cart.' });
        }

        calculatedAmount = cartItems.reduce((total, item) => {
            const price = Number(item.price);
            return total + (isNaN(price) ? 0 : price * item.quantity);
        }, 0);
        
        calculatedAmount = Math.round(calculatedAmount * 100);

        console.log(`[API POST /create-payment-intent] Calculated amount: ${calculatedAmount} (smallest unit) for user ID: ${userId}`);

        if (calculatedAmount <= 0) {
             return res.status(400).json({ error: 'Invalid cart total for payment intent.' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: calculatedAmount,
            currency: 'gbp',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: { userId: userId.toString() }
        });

        console.log(`[API POST /create-payment-intent] PaymentIntent created: ${paymentIntent.id} for user ID: ${userId}`);
        res.send({
            clientSecret: paymentIntent.client_secret,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        });

    } catch (error) {
        console.error(`[API POST /create-payment-intent] Error for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error creating payment intent.' });
    }
});

// === 2FA Setup API Routes ===

app.post('/api/auth/2fa/generate', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const username = req.user.username;

    console.log(`[API POST /2fa/generate] Generating 2FA secret for user ID: ${userId}`);

    try {
        // Generate a new TOTP secret using Speakeasy
        const secret = speakeasy.generateSecret({
            name: `TechStop (${username})`,
            issuer: 'TechStop'
        });

        qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) {
                console.error('[API POST /2fa/generate] QR Code generation error:', err);
                return res.status(500).json({ error: 'Could not generate QR code.' });
            }
            res.json({
                secret: secret.base32,
                qrCodeUrl: data_url,
                otpauthUrl: secret.otpauth_url 
            });
        });

    } catch (error) {
        console.error(`[API POST /2fa/generate] Error generating 2FA secret for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error generating 2FA secret.' });
    }
});

// === Verify 2FA Code After Login ===

app.post('/api/auth/verify-2fa', async (req, res) => {
    const { userId, totpCode } = req.body;

    if (!userId || !totpCode) {
        return res.status(400).json({ error: 'User ID and 2FA code are required.' });
    }

    try {
        const queryText = 'SELECT id, username, email, totp_secret, is_admin, is_2fa_enabled FROM users WHERE id = $1 AND is_2fa_enabled = TRUE;';
        const { rows } = await pool.query(queryText, [userId]);

        if (rows.length === 0) {
            console.error(`[API POST /verify-2fa] User ID ${userId} not found or 2FA not enabled.`);
            return res.status(401).json({ error: 'Invalid user or 2FA not enabled.' });
        }
        const user = rows[0];

        if (!user.totp_secret) {
             console.error(`[API POST /verify-2fa] User ID ${userId} has 2FA enabled but no secret stored!`);
             return res.status(500).json({ error: 'Server configuration error for 2FA.' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.totp_secret, 
            encoding: 'base32',
            token: totpCode,
            window: 1 
        });

        if (verified) {
            console.log(`[API POST /verify-2fa] 2FA code verified for user ID: ${userId}. Issuing token.`);
            const payload = { userId: user.id, username: user.username };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

            res.status(200).json({
                message: 'Login Successful!',
                token: token,
                user: { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin, is_2fa_enabled: user.is_2fa_enabled }
            });
        } else {
            console.log(`[API POST /verify-2fa] Invalid 2FA code for user ID: ${userId}`);
            res.status(401).json({ error: 'Invalid 2FA code.' });
        }

    } catch (error) {
        console.error(`[API POST /verify-2fa] Error verifying 2FA for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error during 2FA verification.' });
    }
});

// --- Verify TOTP Token and Enable 2FA ---

app.post('/api/auth/2fa/verify', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { token, secret } = req.body;

    console.log(`[API POST /2fa/verify] Verifying 2FA token for user ID: ${userId}`);

    if (!token || !secret) {
        return res.status(400).json({ error: 'Token code and secret are required.' });
    }

    try {
        const verified = speakeasy.totp.verify({
            secret: secret, 
            encoding: 'base32',
            token: token,
            window: 1
        });

        if (verified) {
            console.log(`[API POST /2fa/verify] 2FA token verified successfully for user ID: ${userId}`);
            const updateQuery = `
                UPDATE users
                SET is_2fa_enabled = TRUE,
                    totp_secret = $1, -- Save the verified secret
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2;
            `;
            await pool.query(updateQuery, [secret, userId]); 

            console.log(`[API POST /2fa/verify] 2FA enabled and secret saved for user ID: ${userId}`);
            res.json({ verified: true, message: '2FA enabled successfully!' });

        } else {
            console.log(`[API POST /2fa/verify] 2FA token verification failed for user ID: ${userId}`);
            // Token is invalid
            res.status(400).json({ verified: false, error: 'Invalid 2FA code. Please check your authenticator app and try again.' });
        }

    } catch (error) {
        console.error(`[API POST /2fa/verify] Error verifying 2FA token for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error verifying 2FA token.' });
    }
});

// === Disable 2FA API Route ===

app.post('/api/auth/2fa/disable', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { password } = req.body; 

    console.log(`[API POST /2fa/disable] Attempting to disable 2FA for user ID: ${userId}`);

    if (!password) {
        return res.status(400).json({ error: 'Password is required to disable 2FA.' });
    }

    try {
        const userQuery = 'SELECT id, password_hash, is_2fa_enabled FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const user = userResult.rows[0];

        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordMatch) {
            console.log(`[API POST /2fa/disable] Incorrect password for user ID: ${userId}`);
            return res.status(401).json({ error: 'Incorrect password.' });
        }

        if (user.is_2fa_enabled) {
            const updateQuery = `
                UPDATE users
                SET is_2fa_enabled = FALSE,
                    totp_secret = NULL, -- Clear the secret
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1;
            `;
            await pool.query(updateQuery, [userId]);
            console.log(`[API POST /2fa/disable] 2FA disabled successfully for user ID: ${userId}`);
            res.json({ message: 'Two-Factor Authentication has been disabled.' });
        } else {
            console.log(`[API POST /2fa/disable] 2FA already disabled for user ID: ${userId}`);
            res.json({ message: 'Two-Factor Authentication is already disabled.' });
        }

    } catch (error) {
        console.error(`[API POST /2fa/disable] Error disabling 2FA for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error disabling 2FA.' });
    }
});

// === Basic Admin-Only Test Route ===
app.get('/api/admin/test', authenticateToken, authenticateAdmin, (req, res) => {
    console.log(`[API GET /api/admin/test] Accessed by admin user ID: ${req.user.userId}`);
    res.json({ message: 'Welcome, Admin! You have accessed a protected admin route.' });
});

// === Admin Product Management API Routes ===

// Fetch all products for admin view
app.get('/api/admin/products', authenticateToken, authenticateAdmin, async (req, res) => {
    console.log(`[API GET /api/admin/products] Admin request to fetch all products by user ID: ${req.user.userId}`);
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
        console.log(`[API GET /api/admin/products] Found ${result.rows.length} products for admin view.`);
        res.json(result.rows);
    } catch (err) {
        console.error('[API GET /api/admin/products] Error fetching products for admin:', err.stack);
        res.status(500).json({ error: 'Internal Server Error fetching products' });
    }
});

// Add a new product
app.post('/api/admin/products', authenticateToken, authenticateAdmin, async (req, res) => {
    const { name, description, price, stock_quantity, image_url, category_id } = req.body;
    console.log(`[API POST /api/admin/products] Admin request to add new product: ${name} by user ID: ${req.user.userId}`);

    // Basic validation
    if (!name || !description || price === undefined || stock_quantity === undefined) {
        return res.status(400).json({ error: 'Missing required fields: name, description, price, stock_quantity.' });
    }
    const numericPrice = Number(price);
    const intStockQuantity = parseInt(stock_quantity, 10);
    const intCategoryId = category_id ? parseInt(category_id, 10) : null;

    if (isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ error: 'Invalid price format.' });
    }
    if (isNaN(intStockQuantity) || intStockQuantity < 0) {
        return res.status(400).json({ error: 'Invalid stock quantity format.' });
    }
    if (category_id && (isNaN(intCategoryId) || intCategoryId <= 0) && intCategoryId !== null) {
        return res.status(400).json({ error: 'Invalid category ID format.' });
    }

    try {
        const query = `
            INSERT INTO products (name, description, price, stock_quantity, image_url, category_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *;
        `;
        const values = [name, description, numericPrice, intStockQuantity, image_url || null, intCategoryId];
        const result = await pool.query(query, values);
        const newProduct = result.rows[0];

        console.log(`[API POST /api/admin/products] Product added successfully with ID: ${newProduct.id}`);
        res.status(201).json(newProduct);
    } catch (err) {
        console.error('[API POST /api/admin/products] Error adding product:', err.stack);
        // Handle specific errors like foreign key violation for category_id if it's invalid
        if (err.code === '23503') { // PostgreSQL foreign key violation
            return res.status(400).json({ error: 'Invalid category ID or other foreign key constraint.' });
        }
        res.status(500).json({ error: 'Internal Server Error adding product.' });
    }
});

// Update an existing product
app.put('/api/admin/products/:productId', authenticateToken, authenticateAdmin, async (req, res) => {
    const { productId } = req.params;
    const { name, description, price, stock_quantity, image_url, category_id } = req.body;
    console.log(`[API PUT /api/admin/products/:productId] Admin request to update product ID: ${productId} by user ID: ${req.user.userId}`);

    const intProductId = parseInt(productId, 10);
    if (isNaN(intProductId)) {
        return res.status(400).json({ error: 'Invalid Product ID format.' });
    }

    const fieldsToUpdate = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (description !== undefined) fieldsToUpdate.description = description;
    if (price !== undefined) {
        const numericPrice = Number(price);
        if (isNaN(numericPrice) || numericPrice < 0) return res.status(400).json({ error: 'Invalid price.' });
        fieldsToUpdate.price = numericPrice;
    }
    if (stock_quantity !== undefined) {
        const intStock = parseInt(stock_quantity, 10);
        if (isNaN(intStock) || intStock < 0) return res.status(400).json({ error: 'Invalid stock quantity.' });
        fieldsToUpdate.stock_quantity = intStock;
    }
    if (image_url !== undefined) fieldsToUpdate.image_url = image_url === '' ? null : image_url; // Allow clearing image_url
    if (category_id !== undefined) {
        if (category_id === null || category_id === '' || category_id === 0) { // Treat 0 or empty as null
             fieldsToUpdate.category_id = null;
        } else {
            const intCategory = parseInt(category_id, 10);
            if (isNaN(intCategory) || intCategory <= 0) return res.status(400).json({ error: 'Invalid category ID.' });
            fieldsToUpdate.category_id = intCategory;
        }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
        return res.status(400).json({ error: 'No fields provided for update.' });
    }

    fieldsToUpdate.updated_at = new Date();

    const setClauses = Object.keys(fieldsToUpdate).map((key, index) => `"${key}" = $${index + 1}`).join(', ');
    const values = Object.values(fieldsToUpdate);
    values.push(intProductId);
    try {
        const query = `UPDATE products SET ${setClauses} WHERE id = $${values.length} RETURNING *;`;
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        const updatedProduct = result.rows[0];
        console.log(`[API PUT /api/admin/products/:productId] Product ID: ${updatedProduct.id} updated successfully.`);
        res.json(updatedProduct);
    } catch (err) {
        console.error(`[API PUT /api/admin/products/:productId] Error updating product ID ${intProductId}:`, err.stack);
         if (err.code === '23503') { // FK violation
            return res.status(400).json({ error: 'Invalid category ID or other foreign key constraint.' });
        }
        res.status(500).json({ error: 'Internal Server Error updating product.' });
    }
});

// Delete a product
app.delete('/api/admin/products/:productId', authenticateToken, authenticateAdmin, async (req, res) => {
    const { productId } = req.params;
    console.log(`[API DELETE /api/admin/products/:productId] Admin request to delete product ID: ${productId} by user ID: ${req.user.userId}`);

    const intProductId = parseInt(productId, 10);
    if (isNaN(intProductId)) {
        return res.status(400).json({ error: 'Invalid Product ID format.' });
    }

    try {
        const checkOrderItemsQuery = 'SELECT COUNT(*) FROM order_items WHERE product_id = $1';
        const orderItemsResult = await pool.query(checkOrderItemsQuery, [intProductId]);
        if (parseInt(orderItemsResult.rows[0].count, 10) > 0) {
            console.warn(`[API DELETE /api/admin/products/:productId] Attempt to delete product ID: ${intProductId} that is part of existing orders.`);
            return res.status(409).json({ error: 'Cannot delete product. It is referenced in existing orders. Consider deactivating the product instead.' });
        }

        const query = 'DELETE FROM products WHERE id = $1 RETURNING *;';
        const result = await pool.query(query, [intProductId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        console.log(`[API DELETE /api/admin/products/:productId] Product ID: ${intProductId} deleted successfully.`);
        res.status(200).json({ message: 'Product deleted successfully.', product: result.rows[0] });
    } catch (err) {
        console.error(`[API DELETE /api/admin/products/:productId] Error deleting product ID ${intProductId}:`, err.stack);
        // Handle other potential errors, e.g., if ON DELETE RESTRICT was on cart_items
        if (err.code === '23503') { // Foreign key violation
            return res.status(409).json({ error: 'Cannot delete product. It is referenced elsewhere (e.g., in active carts or wishlists).' });
        }
        res.status(500).json({ error: 'Internal Server Error deleting product.' });
    }
});

// Fetch all categories for admin view
app.get('/api/admin/categories', authenticateToken, authenticateAdmin, async (req, res) => {
    console.log(`[API GET /api/admin/categories] Admin request to fetch all categories by user ID: ${req.user.userId}`);
    try {
        const result = await pool.query('SELECT id, name, description FROM categories ORDER BY id ASC');
        console.log(`[API GET /api/admin/categories] Found ${result.rows.length} categories.`);
        res.json(result.rows);
    } catch (err) {
        console.error('[API GET /api/admin/categories] Error fetching categories for admin:', err.stack);
        res.status(500).json({ error: 'Internal Server Error fetching categories' });
    }
});

// === Admin Categories Management API Routes ===

// Fetch all categories for admin view
app.get('/api/admin/categories', authenticateToken, authenticateAdmin, async (req, res) => {
    console.log(`[API GET /api/admin/categories] Admin request to fetch all categories by user ID: ${req.user.userId}`);
    try {
        const result = await pool.query('SELECT id, name, description FROM categories ORDER BY name ASC');
        console.log(`[API GET /api/admin/categories] Found ${result.rows.length} categories.`);
        res.json(result.rows);
    } catch (err) {
        console.error('[API GET /api/admin/categories] Error fetching categories for admin:', err.stack);
        res.status(500).json({ error: 'Internal Server Error fetching categories' });
    }
});

// Create a new category 
app.post('/api/admin/categories', authenticateToken, authenticateAdmin, async (req, res) => {
    const { name, description } = req.body;
    console.log(`[API POST /api/admin/categories] Admin request to create category: ${name}`);

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
        const newCategory = result.rows[0];

        console.log(`[API POST /api/admin/categories] Category created successfully with ID: ${newCategory.id}`);
        res.status(201).json(newCategory);
    } catch (err) {
        console.error('[API POST /api/admin/categories] Error creating category:', err.stack);
        if (err.code === '23505') { // Unique violation for name
            return res.status(409).json({ error: 'Category name already exists.' });
        }
        res.status(500).json({ error: 'Internal Server Error creating category.' });
    }
});

// Update an existing category
app.put('/api/admin/categories/:categoryId', authenticateToken, authenticateAdmin, async (req, res) => {
    const { categoryId } = req.params;
    const { name, description } = req.body;
    console.log(`[API PUT /api/admin/categories] Admin request to update category ID: ${categoryId}`);

    const intCategoryId = parseInt(categoryId, 10);
    if (isNaN(intCategoryId)) {
        return res.status(400).json({ error: 'Invalid Category ID format.' });
    }
    if (name === undefined && description === undefined) {
        return res.status(400).json({ error: 'At least one field (name or description) must be provided for update.' });
    }

    const fieldsToUpdate = {};
    if (name !== undefined) fieldsToUpdate.name = name;
    if (description !== undefined) fieldsToUpdate.description = description === '' ? null : description; // Allow clearing description

    if (Object.keys(fieldsToUpdate).length === 0) {
         return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    fieldsToUpdate.updated_at = new Date();

    const setClauses = Object.keys(fieldsToUpdate).map((key, index) => `"${key}" = $${index + 1}`).join(', ');
    const values = Object.values(fieldsToUpdate);
    values.push(intCategoryId);

    try {
        const query = `UPDATE categories SET ${setClauses} WHERE id = $${values.length} RETURNING *;`;
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found.' });
        }
        const updatedCategory = result.rows[0];
        console.log(`[API PUT /api/admin/categories] Category ID: ${updatedCategory.id} updated successfully.`);
        res.json(updatedCategory);
    } catch (err) {
        console.error(`[API PUT /api/admin/categories] Error updating category ID ${intCategoryId}:`, err.stack);
        if (err.code === '23505') { // Unique violation for name
            return res.status(409).json({ error: 'Category name already exists.' });
        }
        res.status(500).json({ error: 'Internal Server Error updating category.' });
    }
});

//  Delete a category
app.delete('/api/admin/categories/:categoryId', authenticateToken, authenticateAdmin, async (req, res) => {
    const { categoryId } = req.params;
    console.log(`[API DELETE /api/admin/categories] Admin request to delete category ID: ${categoryId}`);

    const intCategoryId = parseInt(categoryId, 10);
    if (isNaN(intCategoryId)) {
        return res.status(400).json({ error: 'Invalid Category ID format.' });
    }

    try {
        const query = 'DELETE FROM categories WHERE id = $1 RETURNING *;';
        const result = await pool.query(query, [intCategoryId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found.' });
        }

        console.log(`[API DELETE /api/admin/categories] Category ID: ${intCategoryId} deleted successfully.`);
        res.status(200).json({ message: 'Category deleted successfully.', category: result.rows[0] });
    } catch (err) {
        console.error(`[API DELETE /api/admin/categories] Error deleting category ID ${intCategoryId}:`, err.stack);
        if (err.code === '23503') { // Foreign key violation
            return res.status(409).json({ error: 'Cannot delete category. It is currently assigned to one or more products.' });
        }
        res.status(500).json({ error: 'Internal Server Error deleting category.' });
    }
});

// === Admin Order Management API Routes ===

// Fetch all orders for admin view
app.get('/api/admin/orders', authenticateToken, authenticateAdmin, async (req, res) => {
    console.log(`[API GET /api/admin/orders] Admin request to fetch all orders by admin user ID: ${req.user.userId}`);
    try {
        const query = `
            SELECT
                o.id AS order_id,
                o.order_date,
                o.total_amount,
                o.status,
                o.shipping_address_id,
                o.billing_address_id,
                o.payment_intent_id,
                u.id AS user_id,
                u.username AS user_username,
                u.email AS user_email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.order_date DESC;
        `;
        const { rows } = await pool.query(query);

        console.log(`[API GET /api/admin/orders] Found ${rows.length} total orders.`);
        res.status(200).json(rows);

    } catch (error) {
        console.error('[API GET /api/admin/orders] Error fetching all orders for admin:', error.stack);
        res.status(500).json({ error: 'Internal Server Error fetching all orders.' });
    }
});

// Fetch Single Order Details API Route
app.get('/api/admin/orders/:orderId', authenticateToken, authenticateAdmin, async (req, res) => {
    const { orderId } = req.params;
    const adminUserId = req.user.userId;

    const intOrderId = parseInt(orderId, 10);
    if (isNaN(intOrderId)) {
        return res.status(400).json({ error: 'Invalid Order ID format.' });
    }

    console.log(`[API GET /api/admin/orders/:orderId] Admin User ID: ${adminUserId} fetching details for Order ID: ${intOrderId}`);

    try {
        const orderQuery = `
            SELECT
                o.id AS order_id,
                o.order_date,
                o.total_amount,
                o.status,
                o.shipping_address_id,
                o.billing_address_id,
                o.payment_intent_id,
                o.user_id,
                u.username AS customer_username,
                u.email AS customer_email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.id = $1;
        `;
        const orderResult = await pool.query(orderQuery, [intOrderId]);

        if (orderResult.rows.length === 0) {
            console.log(`[API GET /api/admin/orders/:orderId] Order ID: ${intOrderId} not found.`);
            return res.status(404).json({ error: 'Order not found.' });
        }
        const orderDetails = orderResult.rows[0];

        // Fetch associated order items
        const itemsQuery = `
            SELECT
                oi.product_id,
                oi.quantity,
                oi.price_per_unit, -- Price at the time of order
                p.name AS product_name,
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
        console.log(`[API GET /api/admin/orders/:orderId] Found ${orderItems.length} items for Order ID: ${intOrderId}`);


        // Fetch shipping address details
        let shippingAddress = null;
        if (orderDetails.shipping_address_id) {
            const addressQuery = `
                SELECT
                    id AS address_id,
                    address_line1,
                    address_line2,
                    city,
                    state_province_region,
                    postal_code,
                    country
                FROM addresses
                WHERE id = $1; 
                -- No need to check user_id here for admin, as admin can see any order's address
            `;
            const addressResult = await pool.query(addressQuery, [orderDetails.shipping_address_id]);
            if (addressResult.rows.length > 0) {
                shippingAddress = addressResult.rows[0];
                console.log(`[API GET /api/admin/orders/:orderId] Found shipping address for Order ID: ${intOrderId}`);
            } else {
                 console.warn(`[API GET /api/admin/orders/:orderId] Shipping address ID ${orderDetails.shipping_address_id} not found for Order ID: ${intOrderId}`);
            }
        } else {
             console.log(`[API GET /api/admin/orders/:orderId] No shipping address ID associated with Order ID: ${intOrderId}`);
        }

        const fullOrderDetails = {
            ...orderDetails, // Spread main order details (id, date, total, status, address IDs, user info)
            items: orderItems, 
            shippingAddress: shippingAddress
        };

        res.status(200).json(fullOrderDetails);

    } catch (error) {
        console.error(`[API GET /api/admin/orders/:orderId] Error fetching details for Order ID ${intOrderId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error fetching order details.' });
    }
});

// Admin - Update Order Status API Route
app.put('/api/admin/orders/:orderId/status', authenticateToken, authenticateAdmin, async (req, res) => {
    const { orderId } = req.params; 
    const { status } = req.body;
    const adminUserId = req.user.userId;

    const intOrderId = parseInt(orderId, 10);
    if (isNaN(intOrderId)) {
        return res.status(400).json({ error: 'Invalid Order ID format.' });
    }

    if (!status || typeof status !== 'string' || status.trim() === '') {
        return res.status(400).json({ error: 'New status is required and must be a non-empty string.' });
    }

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` });
    }

    console.log(`[API PUT /api/admin/orders/:orderId/status] Admin User ID: 
        ${adminUserId} updating status for Order ID: ${intOrderId} to "${status}"`);

    try {
        const updateQuery = `
            UPDATE orders
            SET status = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *; -- Return the full updated order
        `;
        const { rows, rowCount } = await pool.query(updateQuery, [status, intOrderId]);

        if (rowCount === 0) {
            // Order not found
            console.log(`[API PUT /api/admin/orders/:orderId/status] Order ID: ${intOrderId} not found.`);
            return res.status(404).json({ error: 'Order not found.' });
        }

        const updatedOrder = rows[0];
        console.log(`[API PUT /api/admin/orders/:orderId/status] Order ID: ${intOrderId} status updated to "${updatedOrder.status}"`);
        res.status(200).json(updatedOrder);

    } catch (error) {
        console.error(`[API PUT /api/admin/orders/:orderId/status] Error updating status for Order ID ${intOrderId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error updating order status.' });
    }
});

// === Admin User Management API Routes ===

//Fetch all users for admin view
app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
    const adminUserId = req.user.userId; 
    console.log(`[API GET /api/admin/users] Admin User ID: ${adminUserId} fetching all users.`);

    try {
        const query = `
            SELECT
                id,
                username,
                email,
                first_name,
                last_name,
                is_admin,
                is_2fa_enabled,
                created_at,
                updated_at
            FROM users
            ORDER BY id ASC; -- Or order by username, created_at, etc.
        `;
        const { rows } = await pool.query(query);

        console.log(`[API GET /api/admin/users] Found ${rows.length} total users.`);
        res.status(200).json(rows);

    } catch (error) {
        console.error('[API GET /api/admin/users] Error fetching all users:', error.stack);
        res.status(500).json({ error: 'Internal Server Error fetching users.' });
    }
});

// === Admin - Update User Admin Status API Route ===
app.put('/api/admin/users/:targetUserId/role', authenticateToken, authenticateAdmin, async (req, res) => {
    const { targetUserId } = req.params;
    const { isAdmin } = req.body;
    const adminPerformingActionId = req.user.userId;

    const intTargetUserId = parseInt(targetUserId, 10);
    if (isNaN(intTargetUserId)) {
        return res.status(400).json({ error: 'Invalid Target User ID format.' });
    }

    if (typeof isAdmin !== 'boolean') {
        return res.status(400).json({ error: 'isAdmin status (true or false) is required.' });
    }

    if (intTargetUserId === adminPerformingActionId) {
        return res.status(403).json({ error: 'Administrators cannot change their own role via this page.' });
    }

    console.log(`[API PUT /api/admin/users/:targetUserId/role] Admin User ID: ${adminPerformingActionId} attempting to set is_admin=${isAdmin} for User ID: ${intTargetUserId}`);

    try {
        const userCheckQuery = 'SELECT id FROM users WHERE id = $1';
        const userCheckResult = await pool.query(userCheckQuery, [intTargetUserId]);
        if (userCheckResult.rows.length === 0) {
            return res.status(404).json({ error: 'Target user not found.' });
        }

        const updateQuery = `
            UPDATE users
            SET is_admin = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, username, email, first_name, last_name, is_admin, is_2fa_enabled, created_at, updated_at;
        `;
        const { rows, rowCount } = await pool.query(updateQuery, [isAdmin, intTargetUserId]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'User not found during update.' });
        }

        const updatedUser = rows[0];
        console.log(`[API PUT /api/admin/users/:targetUserId/role] User ID: ${intTargetUserId} admin status updated to ${updatedUser.is_admin} by Admin ID: ${adminPerformingActionId}`);
        res.status(200).json(updatedUser);

    } catch (error) {
        console.error(`[API PUT /api/admin/users/:targetUserId/role] Error updating role for User ID ${intTargetUserId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error updating user role.' });
    }
});

// starting server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});