const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// === Stripe Routes ===

// Create Payment Intent
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    let calculatedAmount = 0;
    try {
        console.log(`[Stripe Router] Calculating total for user ID: ${userId}`);

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

        console.log(`[Stripe Router] Calculated amount: ${calculatedAmount} (smallest unit) for user ID: ${userId}`);

        if (calculatedAmount <= 0) {
            return res.status(400).json({ error: 'Invalid cart total for payment intent.' }); 
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: calculatedAmount,
            currency: 'gbp',
            automatic_payment_methods: { enabled: true },
            metadata: { userId: userId.toString() }
        });
        console.log(`[Stripe Router] PaymentIntent created: ${paymentIntent.id} for user ID: ${userId}`);
        res.send({ clientSecret: paymentIntent.client_secret });

    } catch (error) {
        console.error(`[Stripe Router] Error creating payment intent for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error creating payment intent.' });
    }
});


// Stripe Webhook Handler
router.post('/stripe-webhooks', async (req, res) => {

    console.log('[Webhook Router] Received event.');
    const sig = req.headers['stripe-signature'];

    if (!sig || !endpointSecret) {
        console.error('[Webhook Router] Error: Missing signature or secret.');
        return res.status(400).send('Webhook Error: Configuration issue.');
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        console.log('[Webhook Router] Signature verified. Event type:', event.type);
    } catch (err) {
        console.error(`[Webhook Router] ❌ Error verifying webhook signature: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntentSucceeded = event.data.object;
            const paymentIntentId = paymentIntentSucceeded.id;
            console.log(`[Webhook Router] PaymentIntent succeeded: ${paymentIntentId}`);
            try {
                const updateOrderQuery = `
                    UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP 
                    WHERE payment_intent_id = $2 
                    AND status = 'Pending' 
                    RETURNING id, user_id, status;
                `;
                const newStatus = 'Processing'; // Or 'Paid'
                const { rows, rowCount } = await pool.query(updateOrderQuery, [newStatus, paymentIntentId]);
                if (rowCount > 0) {
                    console.log(`[Webhook Router] Order ID ${rows[0].id} status updated to '${rows[0].status}'`);
                    // TODO: Trigger confirmation email (future implementation)
                } else {
                    console.warn(`[Webhook Router] No pending order found or already processed for PaymentIntent ${paymentIntentId}.`);
                }
            } catch (dbError) {
                console.error(`[Webhook Router] ❌ Database error handling PaymentIntent ${paymentIntentId}:`, dbError.stack);
                return res.status(500).send('Webhook Error: Database update failed.'); // retry
            }
            break;
        case 'payment_intent.payment_failed':
            const paymentIntentFailed = event.data.object;
            console.log(`[Webhook Router] PaymentIntent failed: ${paymentIntentFailed.id}`, paymentIntentFailed.last_payment_error?.message);
            break;
        default:
            console.log(`[Webhook Router] Unhandled event type ${event.type}`);
    }
    res.status(200).json({ received: true }); // 200 success
});

module.exports = router;
