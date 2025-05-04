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

app.get('/api/message', (req, res) => {
  res.json({ message: 'Hello from the backend! (Served using Yarn)' });
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