const express = require('express'); // express.js
const cors = require('cors'); // For communication between the frontend and backend
const bcrypt = require('bcrypt'); // For password hashing
const jwt = require('jsonwebtoken'); // For generating JWT tokens
require('dotenv').config(); // Ensure dotenv runs first
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// Import the database pool directly from db.js
const pool = require('./db'); 

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Stripe library
const app = express();
const PORT = process.env.PORT || 5001;
const saltRounds = 10;

const authenticateToken = require('./middleware/authenticateToken');

// --- Middleware ---
app.use(cors());

// --- API Routes ---

// === Stripe Webhook Endpoint ===
// Using express.raw for raw body parsing
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

    // --- Handle the event ---
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntentSucceeded = event.data.object;
            const paymentIntentId = paymentIntentSucceeded.id;
            console.log(`[Webhook] PaymentIntent succeeded: ${paymentIntentId}`);

            // --- Database Update Logic ---
            try {
                // Find the order associated with the PaymentIntent ID and
                // update its status to 'Processing' or 'Paid'
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
                    // await sendOrderConfirmationEmail(updatedOrder.user_id, updatedOrder.id);
                } else {
                    // This might happen if the webhook arrives before the order is created,
                    // or if the order status was already updated (e.g., by a previous webhook delivery).
                    console.warn(`[Webhook] No pending order found or already processed for PaymentIntent ${paymentIntentId}.`);
                }

            } catch (dbError) {
                console.error(`[Webhook] ❌ Database error handling PaymentIntent ${paymentIntentId}:`, dbError.stack);
                // Handle DB errors. Returning 500 tells Stripe to retry.
                return res.status(500).send('Webhook Error: Database update failed.');
            }
            // --- End Database Update Logic ---
            break; // End case payment_intent.succeeded

        case 'payment_intent.payment_failed':
            const paymentIntentFailed = event.data.object;
            console.log(`[Webhook] PaymentIntent failed: ${paymentIntentFailed.id}`, paymentIntentFailed.last_payment_error?.message);
            // TODO: Log failure, potentially update order status to 'Failed', notify user?
            break;

        default:
            console.log(`[Webhook] Unhandled event type ${event.type}`);
    }
    // --- End Event Handling ---


    // Acknowledge receipt of the event to Stripe
    res.status(200).json({ received: true });
});

app.use(express.json());  // moved under the stripe webhook

// === Order Creation API Route ===

app.post('/api/orders', authenticateToken, async (req, res) => {
    const userId = req.user.userId; // Get user ID from authenticated token
    // Destructure expected data from the request body sent by the frontend
    const { shippingDetails, items, total, paymentIntentId } = req.body;

    console.log(`[API POST /api/orders] Attempting order creation for user ID: ${userId}, PayemntIntend: ${paymentIntentId}`);

    // --- Basic Validation ---
    if (!shippingDetails || !items || !Array.isArray(items) || items.length === 0 || total === undefined || total === null || !paymentIntentId) {
        console.error(`[API POST /api/orders] Invalid order data received for user ID: ${userId}`, req.body);
        return res.status(400).json({ error: 'Invalid order data. Shipping details, items, total, and paymentIntentId are required.' });
    }
    // Validate shipping details object
    const { fullName, address1, address2, city, postcode, country } = shippingDetails; // Destructure address2 here as well
    if (!fullName || !address1 || !city || !postcode || !country) {
         return res.status(400).json({ error: 'Missing required shipping fields (Full Name, Address Line 1, City, Postcode, Country).' });
    }
    // Validate total amount
     const numericTotal = Number(total);
     if (isNaN(numericTotal) || numericTotal < 0) {
         return res.status(400).json({ error: 'Invalid total amount.' });
     }
    // --- End Validation ---


    // --- Database Transaction ---
    // Use a client from the pool for transaction control
    const client = await pool.connect();
    console.log(`[API POST /api/orders] Database client acquired for user ID: ${userId}`);

    try {
        // Start the transaction
        await client.query('BEGIN');
        console.log(`[API POST /api/orders] Transaction started for user ID: ${userId}`);

        // --- ADDRESS HANDLING ---
        let shippingAddressId;

        // 1a. Check if an identical shipping address already exists for this user
        // Note: Removed state_province_region check for now as it's not collected
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
            // 1b. Use existing address ID
            shippingAddressId = existingAddressResult.rows[0].id;
            console.log(`[API POST /api/orders] Found existing shipping address with ID: ${shippingAddressId} for user ID: ${userId}`);
        } else {
            // 1c. Insert New Shipping Address into 'addresses' table
            console.log(`[API POST /api/orders] No identical shipping address found. Inserting new address for user ID: ${userId}`);
            const insertAddressQuery = `
                INSERT INTO addresses (user_id, address_line1, address_line2, city, state_province_region, postal_code, country, address_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id;
            `;
            const insertAddressValues = [
                userId,                     // $1
                shippingDetails.address1,   // $2
                shippingDetails.address2 || null, // $3
                shippingDetails.city,       // $4
                null,                       // $5 - Placeholder for state_province_region
                shippingDetails.postcode,   // $6
                shippingDetails.country,    // $7
                'shipping'                  // $8
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

        // 3. Insert Order Items into 'order_items' table (remains the same)
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


        // Commit the transaction
        await client.query('COMMIT');
        console.log(`[API POST /api/orders] Transaction committed for Order ID: ${newOrderId}`);

        // Send success response
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
// This route should be protected

app.get('/api/orders', authenticateToken, async (req, res) => {
    const userId = req.user.userId; // Get user ID from authenticated token
    console.log(`[API GET /api/orders] Fetching order history for user ID: ${userId}`);

    try {
        // Query to get the main order details for the logged-in user
        // Ordering by order_date descending to show newest orders first
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
    const userId = req.user.userId; // getting userId from token payload
    console.log(`[API GET /api/cart] Fetching cart for user ID ${userId}`);

    try {
        // Query to join cart_items with products to get product details
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

        // Format query response to match frontend expectations
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
    const userId = req.user.userId; // Get user ID from authenticated token
    const { orderId } = req.params; // Get order ID from URL parameter

    // Validate orderId is a number
    const intOrderId = parseInt(orderId, 10);
    if (isNaN(intOrderId)) {
        return res.status(400).json({ error: 'Invalid Order ID format.' });
    }

    console.log(`[API GET /api/orders/:orderId] Fetching details for Order ID: ${intOrderId}, User ID: ${userId}`);

    try {
        // --- Fetch main order details ---
        // Ensure the order belongs to the requesting user
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

        // --- Fetch associated order items ---
        // Join with products table to get product details
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
            pricePerUnit: item.price_per_unit, // Use the price stored with the order item
            name: item.product_name,
            imageUrl: item.product_image_url
        }));
        console.log(`[API GET /api/orders/:orderId] Found ${orderItems.length} items for Order ID: ${intOrderId}`);


        // --- Fetch shipping address details ---
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
                 // Decide how to handle this - return null or error? Returning null for now.
            }
        } else {
             console.log(`[API GET /api/orders/:orderId] No shipping address ID associated with Order ID: ${intOrderId}`);
        }

        // --- Combine results and send response ---
        const fullOrderDetails = {
            ...orderDetails, // Spread main order details (id, date, total, status, address IDs)
            items: orderItems, // Add the array of items
            shippingAddress: shippingAddress // Add the fetched shipping address object (or null)
        };

        res.status(200).json(fullOrderDetails);

    } catch (error) {
        console.error(`[API GET /api/orders/:orderId] Error fetching details for Order ID ${intOrderId}, User ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error fetching order details.' });
    }
});

// POST /api/cart/items - Add an item to the cart (or update quantity if exists)
app.post('/api/cart/items', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId, quantity } = req.body; // Get product ID and quantity from request body

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
        // Using INSERT ... ON CONFLICT to handle adding or updating quantity
        // This leverages the UNIQUE constraint on (user_id, product_id)
        const query = `
            INSERT INTO cart_items (user_id, product_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, product_id)
            DO UPDATE SET
                quantity = cart_items.quantity + $3, -- Increment quantity
                updated_at = CURRENT_TIMESTAMP      -- Update timestamp
            RETURNING *; -- Return the added/updated row
        `;
        // Note: Passing intQuantity ($3) twice - once for insert, once for update increment
        const { rows } = await pool.query(query, [userId, productId, intQuantity]);
        const addedOrUpdatedItem = rows[0];

        console.log(`[API POST /api/cart/items] Item added/updated for User ID: ${userId}, Product ID: ${productId}`);

        // Fetch the updated cart to return it (consistent with GET /api/cart format)
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
        // Handle potential foreign key constraint errors if productId doesn't exist
        if (error.code === '23503') { // Foreign key violation
             return res.status(404).json({ error: 'Product not found.' });
        }
        res.status(500).json({ error: 'Internal Server Error adding item to cart' });
    }
});

// PUT /api/cart/items/:productId - Update quantity of a specific item
app.put('/api/cart/items/:productId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.params; // Get product ID from URL parameter
    const { quantity } = req.body; // Get new quantity from request body

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
             // Fetch and return updated cart after deletion
             const getCartQuery = `SELECT ci.product_id, ci.quantity, p.name, p.price, p.image_url FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = $1 ORDER BY ci.added_at ASC;`;
             const cartResult = await pool.query(getCartQuery, [userId]);
             const cartItems = cartResult.rows.map(item => ({ product: { id: item.product_id, name: item.name, price: item.price, image_url: item.image_url }, quantity: item.quantity }));
             return res.status(200).json(cartItems);

        } catch (error) {
             console.error(`[API PUT /api/cart/items] Error removing item for User ID ${userId}, Product ID ${intProductId}:`, error.stack);
             return res.status(500).json({ error: 'Internal Server Error removing item from cart' });
        }
    }

    console.log(`[API PUT /api/cart/items] User ID: ${userId} updating Product ID: ${intProductId} to Quantity: ${intQuantity}`);

    try {
        // Update the quantity for the specific item and user
        const query = `
            UPDATE cart_items
            SET quantity = $1, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2 AND product_id = $3
            RETURNING *; -- Return the updated row
        `;
        const { rows, rowCount } = await pool.query(query, [intQuantity, userId, intProductId]);

        if (rowCount === 0) {
            // The item wasn't in the cart for this user
            console.log(`[API PUT /api/cart/items] Cart item not found for User ID: ${userId}, Product ID: ${intProductId}`);
            return res.status(404).json({ error: 'Cart item not found.' });
        }

        console.log(`[API PUT /api/cart/items] Quantity updated for User ID: ${userId}, Product ID: ${intProductId}`);

        // Fetch and return updated cart
        const getCartQuery = `SELECT ci.product_id, ci.quantity, p.name, p.price, p.image_url FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = $1 ORDER BY ci.added_at ASC;`;
        const cartResult = await pool.query(getCartQuery, [userId]);
        const cartItems = cartResult.rows.map(item => ({ product: { id: item.product_id, name: item.name, price: item.price, image_url: item.image_url }, quantity: item.quantity }));
        res.status(200).json(cartItems);

    } catch (error) {
        console.error(`[API PUT /api/cart/items] Error updating quantity for User ID ${userId}, Product ID ${intProductId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error updating cart item quantity' });
    }
});

// DELETE /api/cart/items/:productId - Remove a specific item from the cart
app.delete('/api/cart/items/:productId', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { productId } = req.params; // Get product ID from URL parameter

    const intProductId = parseInt(productId, 10);
     if (isNaN(intProductId)) {
         return res.status(400).json({ error: 'Invalid Product ID format.' });
    }

    console.log(`[API DELETE /api/cart/items] User ID: ${userId} removing Product ID: ${intProductId}`);

    try {
        // Delete the specific item for the user
        const query = 'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING *';
        const { rowCount } = await pool.query(query, [userId, intProductId]);

        if (rowCount === 0) {
            // Item wasn't in the cart
            console.log(`[API DELETE /api/cart/items] Cart item not found for User ID: ${userId}, Product ID: ${intProductId}`);
            return res.status(404).json({ error: 'Cart item not found.' });
        }

        console.log(`[API DELETE /api/cart/items] Item removed for User ID: ${userId}, Product ID: ${intProductId}`);

        // Fetch and return updated cart
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
        // Delete all items for the user
        const query = 'DELETE FROM cart_items WHERE user_id = $1 RETURNING *';
        const { rowCount } = await pool.query(query, [userId]);

        console.log(`[API DELETE /api/cart] Cleared ${rowCount} items for user ID: ${userId}`);
        res.status(200).json([]); // Return empty array representing the cleared cart

    } catch (error) {
        console.error(`[API DELETE /api/cart] Error clearing cart for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error clearing cart' });
    }
});

// == API Endpoint to get all products (Using pool directly) ==
app.get('/api/products', async (req, res) => {
  console.log('Received request for /api/products');
  try {
    // Check if pool and pool.query exist before using them
    if (!pool || typeof pool.query !== 'function') {
       console.error('--- FATAL: Database pool or pool.query is not available! ---', pool);
       return res.status(500).json({ error: 'Database connection not initialized correctly.' });
    }

    // Use the imported pool directly to query the database
    const result = await pool.query('SELECT id, name, price, image_url FROM products ORDER BY name ASC');

    console.log(`Found ${result.rows.length} products`);
    res.json(result.rows);

  } catch (err) {
    // Log the detailed error stack from the catch block
    console.error('Error during /api/products query execution:', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API endpoint to get a single product by ID
app.get('/api/products/:id', async (req, res) => {
    //Extract the product id from the req params
    const productID = parseInt(req.params.id, 10) // Parse as integer of base 1o
    console.log(`Received request for /api/products/${productID}`);

    // validation check to check if ID is a valid number
    if (isNaN(productID)) {
        return res.status(400).json({error: 'Invalid product ID format'});
    }

    try {
        // checking if pool and pool.query exist before using them
        if (!pool || typeof pool.query !== 'function') {
            console.error('--- FATAL: Database pool or pool.query is not available! ---', pool);
            return res.status(500).json({error: 'Database connection not initialized correctly.'});
        }

        // SQL parameterized query to select product by ID
        const queryText = 'SELECT * FROM products WHERE id = $1';
        const values = [productID];

        //Executing the query
        const result = await pool.query(queryText, values);

        // check if a product was found 
        if(result.rows.length === 0) {
            // no product found, send 404
            console.log(`Product with ID ${productID} not found`);
            return res.status(404).json({error: 'Product not found.'});
        }

        // Product found, send details as JSON
        console.log(`Found product with ID ${productID}: ${result.rows[0].name}`);
        res.json(result.rows[0]);
    } catch (err) {
        // log db errors
        console.error(`Error during /api/products/${productID} query execution:`, err.stack);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

// === Authentication Routes ===

// --- Registration ---
app.post('/api/auth/register', async (req, res) => {
    // Extract user details from request body
    const {username, email, password, first_name, last_name} = req.body;
    console.log('Registration attempt for:', email);

    // Basic validation
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
        // Duplicate email/username
        if(err.code === '23505') { // postgres unique violation code
            console.error('Registration Error: Username or email already exists. Please log in.', err.detail);
            return res.status(409).json({error: 'Username or email already exists.'}); // 409 Conflict
        }
        // Database or hashing errirs
        console.error('Error during registration:', err.stack);
        res.status(500).json({error: 'Internal Server Error during registration'});
    }
});

// --- Login ---
// === UPDATED: Login Route (Checks for 2FA) ===
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('[API POST /login] Login attempt for:', email);

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // 1. Find the user by email
        const queryText = 'SELECT id, username, email, password_hash, is_2fa_enabled FROM users WHERE email = $1';
        const values = [email];
        const result = await pool.query(queryText, values);

        if (result.rows.length === 0) {
            console.log('[API POST /login] Login failed: User not found for email:', email);
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const user = result.rows[0];

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.log('[API POST /login] Login failed: Incorrect password for email:', email);
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // --- Check if 2FA is enabled ---
        if (user.is_2fa_enabled) {
            // 3a. If 2FA is enabled, DO NOT send token yet.
            // Send response indicating 2FA is required.
            // Include userId/email to be used in the next step
            console.log(`[API POST /login] 2FA required for user ID: ${user.id}`);
            res.status(200).json({
                requires2FA: true,
                userId: user.id, // Send userId and email to frontend to use in the next step
                email: user.email 
            });
        } else {
            // 3b. If 2FA is not enabled, generate and send JWT token as before.
            console.log(`[API POST /login] Login successful (2FA not enabled) for user ID: ${user.id}`);
            const payload = { userId: user.id, username: user.username };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

            res.status(200).json({
                message: 'Login Successful!',
                token: token,
                user: { id: user.id, username: user.username, email: user.email }
                // DO NOT send requires2FA: false here, absence implies not required
            });
        }
        // --- End 2FA Check ---

    } catch (err) {
        console.error('[API POST /login] Error during login:', err.stack);
        res.status(500).json({ error: 'Internal Server Error during login.' });
    }
});

// == TODO: Add more routes here (e.g., orders, protected routes) ==
// === PROTECTED ROUTE: Get current user's info ===
// This route uses the authenticateToken middleware first
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    // If execution reaches here, the token was valid and authenticateToken added `req.user`
    console.log('Accessing /api/auth/me for user ID:', req.user.userId); // req.user comes from the middleware

    const { userId } = req.user; // Get userId from the JWT payload decoded by the middleware

    try {
        // Fetch user details from the database using the userId from the token

        const getUserQuery = 'SELECT id, username, email, first_name, last_name, is_2fa_enabled FROM users WHERE id = $1';
        const { rows } = await pool.query(getUserQuery, [userId]);
        const userFromDb = rows[0];

        if (!userFromDb) {
            // Should not happen if token is valid unless user was deleted after token issuance
            console.warn(`User with ID ${userId} from token not found in database.`);
            return res.status(404).json({ message: "User associated with token not found" });
        }

        // Send back the relevant user information
        res.status(200).json({
            id: userFromDb.id,
            username: userFromDb.username,
            email: userFromDb.email,
            first_name: userFromDb.first_name,
            last_name: userFromDb.last_name,
            is_2fa_enabled: userFromDb.is_2fa_enabled
            // Add any other non-sensitive fields you want the client to have
        });

    } catch (error) {
        console.error('Error fetching user details for /api/auth/me route:', error.stack);
        res.status(500).json({ message: 'Internal server error fetching user details' });
    }
});

// ===  Payment Intent API Route ===
// This route is called by the frontend before confirming the payment
app.post('/api/create-payment-intent', authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    // Fetch cart items and calculate total here to prevent tampering
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
            const price = Number(item.price); // Ensure price is a number
            return total + (isNaN(price) ? 0 : price * item.quantity);
        }, 0);

        // Convert to smallest currency unit (e.g., pence for GBP, cents for USD/EUR)
        
        calculatedAmount = Math.round(calculatedAmount * 100); // GBP/USD/EUR

        console.log(`[API POST /create-payment-intent] Calculated amount: ${calculatedAmount} (smallest unit) for user ID: ${userId}`);

        if (calculatedAmount <= 0) {
             return res.status(400).json({ error: 'Invalid cart total for payment intent.' });
        }

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: calculatedAmount,
            currency: 'gbp',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: { userId: userId.toString() }
        });

        console.log(`[API POST /create-payment-intent] PaymentIntent created: ${paymentIntent.id} for user ID: ${userId}`);

        // Send publishable key and PaymentIntent client_secret to client
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

// --- Generate 2FA Secret and QR Code ---
// This endpoint generates a temporary secret and QR code for setup.
// It doesn't save anything permanently until verification.
app.post('/api/auth/2fa/generate', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const username = req.user.username; // Get username from token payload

    console.log(`[API POST /2fa/generate] Generating 2FA secret for user ID: ${userId}`);

    try {
        // Generate a new TOTP secret using Speakeasy
        const secret = speakeasy.generateSecret({
            name: `TechStop (${username})`, // Label shown in authenticator app
            issuer: 'TechStop' // Your application name
        });

        // secret.ascii: The secret key in ASCII format
        // secret.base32: The secret key in Base32 format
        // secret.otpauth_url: A URL including the secret for easy QR code generation

        console.log(`[API POST /2fa/generate] Secret generated for user ID: ${userId}`);
        // console.log(secret); // For debugging - DO NOT log secrets in production

        // Generate QR code data URL from the otpauth_url
        qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) {
                console.error('[API POST /2fa/generate] QR Code generation error:', err);
                return res.status(500).json({ error: 'Could not generate QR code.' });
            }

            console.log(`[API POST /2fa/generate] QR Code generated for user ID: ${userId}`);

            // Send back the temporary secret (Base32) and the QR code data URL
            // The frontend needs the secret temporarily to verify the first code.
            res.json({
                secret: secret.base32, // Send Base32 secret for manual entry if needed
                qrCodeUrl: data_url, // Send QR code image data URL
                otpauthUrl: secret.otpauth_url // Send the raw URL (in case)
            });
        });

    } catch (error) {
        console.error(`[API POST /2fa/generate] Error generating 2FA secret for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error generating 2FA secret.' });
    }
});

// === Verify 2FA Code After Login ===
// This endpoint is called after successful password login IF 2FA is required.
app.post('/api/auth/verify-2fa', async (req, res) => {
    // Expecting userId (sent back from /login) and the totpCode from the user's app
    const { userId, totpCode } = req.body;

    console.log(`[API POST /verify-2fa] Verifying 2FA code for user ID: ${userId}`);

    if (!userId || !totpCode) {
        return res.status(400).json({ error: 'User ID and 2FA code are required.' });
    }

    try {
        // 1. Fetch the user's stored secret and details
        const queryText = 'SELECT id, username, email, totp_secret FROM users WHERE id = $1 AND is_2fa_enabled = TRUE;';
        const { rows } = await pool.query(queryText, [userId]);

        if (rows.length === 0) {
            // User not found or 2FA isn't enabled
            console.error(`[API POST /verify-2fa] User ID ${userId} not found or 2FA not enabled.`);
            return res.status(401).json({ error: 'Invalid user or 2FA not enabled.' });
        }
        const user = rows[0];

        if (!user.totp_secret) {
             console.error(`[API POST /verify-2fa] User ID ${userId} has 2FA enabled but no secret stored!`);
             return res.status(500).json({ error: 'Server configuration error for 2FA.' });
        }

        // 2. Verify the submitted code against the stored secret
        const verified = speakeasy.totp.verify({
            secret: user.totp_secret, // Use the secret stored in the DB
            encoding: 'base32',
            token: totpCode,
            window: 1 // Allow some time drift
        });

        if (verified) {
            // 3. Code is valid, generate and return JWT token.
            console.log(`[API POST /verify-2fa] 2FA code verified for user ID: ${userId}. Issuing token.`);
            const payload = { userId: user.id, username: user.username };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

            res.status(200).json({
                message: 'Login Successful!',
                token: token,
                user: { id: user.id, username: user.username, email: user.email }
            });
        } else {
            // 4. Code is invalid.
            console.log(`[API POST /verify-2fa] Invalid 2FA code for user ID: ${userId}`);
            res.status(401).json({ error: 'Invalid 2FA code.' });
        }

    } catch (error) {
        console.error(`[API POST /verify-2fa] Error verifying 2FA for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error during 2FA verification.' });
    }
});

// --- Verify TOTP Token and Enable 2FA ---
// This endpoint verifies the code entered by the user against the temporary secret
// and, if valid, saves the secret and enables 2FA in the database.
app.post('/api/auth/2fa/verify', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    // The frontend sends the temporary secret received from /generate
    // along with the token entered by the user from their authenticator app.
    const { token, secret } = req.body;

    console.log(`[API POST /2fa/verify] Verifying 2FA token for user ID: ${userId}`);

    if (!token || !secret) {
        return res.status(400).json({ error: 'Token code and secret are required.' });
    }

    try {
        // Verify the token submitted by the user against the temporary secret
        const verified = speakeasy.totp.verify({
            secret: secret, // The Base32 secret generated previously
            encoding: 'base32',
            token: token, // The 6-digit code from the user's app
            window: 1 // Allow codes from 1 step before/after current time window (e.g., 30 seconds)
        });

        if (verified) {
            console.log(`[API POST /2fa/verify] 2FA token verified successfully for user ID: ${userId}`);
            // Token is valid, save the secret to the database and enable 2FA.
            const updateQuery = `
                UPDATE users
                SET is_2fa_enabled = TRUE,
                    totp_secret = $1, -- Save the verified secret
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2;
            `;
            await pool.query(updateQuery, [secret, userId]); // Save the Base32 secret

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
// This route requires the user's current password to disable 2FA
app.post('/api/auth/2fa/disable', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { password } = req.body; // Expect password from the request body

    console.log(`[API POST /2fa/disable] Attempting to disable 2FA for user ID: ${userId}`);

    if (!password) {
        return res.status(400).json({ error: 'Password is required to disable 2FA.' });
    }

    try {
        // 1. Fetch the user's current hashed password and 2FA status
        const userQuery = 'SELECT id, password_hash, is_2fa_enabled FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const user = userResult.rows[0];

        // 2. Verify the provided password
        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordMatch) {
            console.log(`[API POST /2fa/disable] Incorrect password for user ID: ${userId}`);
            return res.status(401).json({ error: 'Incorrect password.' });
        }

        // 3. If password is correct, disable 2FA
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
            // 2FA is already disabled
            console.log(`[API POST /2fa/disable] 2FA already disabled for user ID: ${userId}`);
            res.json({ message: 'Two-Factor Authentication is already disabled.' });
        }

    } catch (error) {
        console.error(`[API POST /2fa/disable] Error disabling 2FA for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error disabling 2FA.' });
    }
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});