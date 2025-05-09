const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

// Middleware Imports
const authenticateToken = require('./middleware/authenticateToken');
const authenticateAdmin = require('./middleware/authenticateAdmin'); // Ensure this exists

// Router Imports
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const stripeRoutes = require('./routes/stripe'); // Assuming stripe.js contains both intent and webhook
const reviewRoutes = require('./routes/reviews');


const app = express();
const PORT = process.env.PORT || 5001;

// CORS Configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.CLIENT_URL 
        : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Global Middleware
app.use(cors());

// Stripe Webhook Route 
app.post('/api/stripe-webhooks', express.raw({ type: 'application/json' }), (req, res, next) => {
    console.log('[Server] Raw body middleware executed for /api/stripe-webhooks');
    next();
});

app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// API Route Mounting
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes); 
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/reviews', reviewRoutes);



app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // DB connecrion check
  pool.connect((err, client, release) => {
      if (err) { return console.error('Error acquiring client on startup', err.stack); }
      console.log('Database pool connected successfully!');
      release();
  });
});
