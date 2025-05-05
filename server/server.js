const express = require('express'); // express.js
const cors = require('cors'); // For communication between the frontend and backend
const bcrypt = require('bcrypt'); // For password hashing
const jwt = require('jsonwebtoken'); // For generating JWT tokens
require('dotenv').config(); // Ensure dotenv runs first

// Import the database pool directly from db.js
const pool = require('./db'); 

const app = express();
const PORT = process.env.PORT || 5001;
const saltRounds = 10;

const authenticateToken = require('./middleware/authenticateToken');

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- API Routes ---

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
app.post('/api/auth/login', async (req, res) => {
    const {email, password } = req.body // can login with email or username
    console.log('Login attempt for:', email);

    if(!email || !password) {
        return res.status(400).json({error: 'Email and password are required.'});
    }

    try {
        // 1. Find the user by email (or username)
        const queryText = 'SELECT id, username, email, password_hash FROM users WHERE email = $1';
        const values = [email];
        const result = await pool.query(queryText, values);

        if (result.rows.length === 0) {
            // User not found
            console.log('Login failed: User not found for email:', email);
            return res.status(401).json({error: 'Invalid credentials.'}); // 401 Unauthorised
        }

        const user = result.rows[0];

        // 2. Compare the provided password with thw stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if(!isMatch) {
            // Password mismatch
            console.log('Login failed: Incorrect password for email:', email);
            return res.status(401).json({error: 'Invalid credentials.'}); // 401 Unauthorised
        }

        // 3. Passwords match - Generate JWT token
        const payload = {
            userId: user.id,
            username: user.username
        };

        // Signing token with secret key and defining expiration time
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            {expiresIn: '1h'} // Tokens expire in one hour (can be adjusted)
        );

        console.log('Login Successful, token generated for:', email);

        // 4. Sending token and user info back to client
        res.json({
            message: 'Login Successful!',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (err) {
        console.error('Error during login', err.stack);
        res.status(500).json({error: 'Internal Server Error during login.'});
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
        // Avoid selecting the password hash!
        const getUserQuery = 'SELECT id, username, email, first_name, last_name FROM users WHERE id = $1';
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
            last_name: userFromDb.last_name
            // Add any other non-sensitive fields you want the client to have
        });

    } catch (error) {
        console.error('Error fetching user details for /api/auth/me route:', error.stack);
        res.status(500).json({ message: 'Internal server error fetching user details' });
    }
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});