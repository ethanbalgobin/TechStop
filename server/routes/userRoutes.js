// Example within an Express router file (e.g., routes/userRoutes.js)

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // For password hashing
const jwt = require('jsonwebtoken'); // For creating JWTs

const pool = require('../db')

// Import the authentication middleware we created earlier
// Adjust the path ('../middleware/...') based on your file structure
const authenticateToken = require('../middleware/authenticateToken');

const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

// --- Public Routes (No Authentication Needed) ---

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // 2. Find user by username in the database using 'pg'
    const findUserQuery = 'SELECT * FROM users WHERE username = $1';
    const { rows } = await pool.query(findUserQuery, [username]); // Use your imported pool object
    const user = rows[0]; // pg returns rows in an array; get the first one

    if (!user) {
      // User not found - Use a generic error message for security
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Compare provided password with the stored hash
    // Ensure your users table has a 'password_hash' column (or similar name)
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Passwords don't match - Use a generic error message
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 4. Passwords match! Create JWT Payload
    const payload = {
      userId: user.id, // Ensure your users table has an 'id' column (primary key)
      username: user.username
    };

    // 5. Sign the JWT
    const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' } // Example: token expires in 1 hour
    );

    // 6. Send the token and user info back to the client
    res.status(200).json({
      message: "Login Successful!",
      token: token,
      user: { // Send back non-sensitive user data
        id: user.id,
        username: user.username,
        email: user.email // Ensure your users table has an 'email' column
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

// Registration route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }
    // Add more validation as needed

    // 2. Check if user already exists (by username or email) using 'pg'
    const checkUserQuery = 'SELECT id FROM users WHERE username = $1 OR email = $2';
    const { rows: existingRows } = await pool.query(checkUserQuery, [username, email]); // Use your imported pool object

    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'Username or email already exists' }); // 409 Conflict
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Create new user in the database using 'pg'
    const insertUserQuery = `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, email`; // RETURNING clause gets the inserted data back
    const { rows: insertRows } = await pool.query(insertUserQuery, [username, email, hashedPassword]); // Use your imported pool object
    const newUser = insertRows[0];

    // 5. Send success response
    res.status(201).json({ // 201 Created
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    // Handle specific database errors if needed (e.g., unique constraint violations)
    if (error.code === '23505') { // PostgreSQL unique violation error code
        return res.status(409).json({ message: 'Username or email already exists.' });
    }
    res.status(500).json({ message: 'Internal server error during registration' });
  }
});


// --- Protected Routes (Authentication Required) ---

// Example: Get the current user's profile information (/api/me or /api/users/me)
router.get('/me', authenticateToken, async (req, res) => {
  // If the code reaches here, authenticateToken successfully verified the JWT.
  // The decoded payload is in `req.user`.
  console.log('Accessing /me route for user:', req.user);

  const { userId } = req.user; // Get userId from the token payload

  try {
    // Fetching minimal, non-sensitive user details from DB using userId
    const getUserQuery = 'SELECT id, username, email FROM users WHERE id = $1';
    const { rows } = await pool.query(getUserQuery, [userId]); // Use your imported pool object
    const userFromDb = rows[0];

    if (!userFromDb) {
      // This case might indicate a deleted user whose token is still valid briefly
      // Or if the userId in the token is somehow invalid
      console.warn(`User with ID ${userId} from token not found in database.`);
      return res.status(404).json({ message: "User associated with token not found" });
    }

    // Send back the user information fetched from the database
    res.status(200).json({
      id: userFromDb.id,
      username: userFromDb.username,
      email: userFromDb.email
    });
  } catch (error) {
      console.error('Error fetching user details for /me route:', error);
      res.status(500).json({ message: 'Internal server error fetching user details' });
  }
});

// Another protected route (e.g., update profile)
// router.put('/profile/update', authenticateToken, async (req, res) => {
//   const { userId } = req.user;
//   const { /* fields to update */ } = req.body;
//   try {
//     // Construct and execute UPDATE query using pool.query
//     // Remember to only update allowed fields and use parameterized queries ($1, $2...)
//     // Example: await pool.query('UPDATE users SET email = $1 WHERE id = $2', [newEmail, userId]);
//     res.status(200).json({ message: 'Profile updated successfully' });
//   } catch (error) {
//     console.error('Profile update error:', error);
//     res.status(500).json({ message: 'Internal server error updating profile' });
//   }
// });

module.exports = router;
