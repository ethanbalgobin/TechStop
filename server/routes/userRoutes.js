const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // For password hashing
const jwt = require('jsonwebtoken'); // For creating JWTs

const pool = require('../db')
const authenticateToken = require('../middleware/authenticateToken');

const SALT_ROUNDS = 10; 

// Public Routes

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const findUserQuery = 'SELECT * FROM users WHERE username = $1';
    const { rows } = await pool.query(findUserQuery, [username]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // password match - creating JWT payload
    const payload = {
      userId: user.id,
      username: user.username
    };

    const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.status(200).json({
      message: "Login Successful!",
      token: token,
      user: { 
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
});


router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    const checkUserQuery = 'SELECT id FROM users WHERE username = $1 OR email = $2';
    const { rows: existingRows } = await pool.query(checkUserQuery, [username, email]);

    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'Username or email already exists' }); // 409 Conflict
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const insertUserQuery = `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, email`;
    const { rows: insertRows } = await pool.query(insertUserQuery, [username, email, hashedPassword]); 
    const newUser = insertRows[0];

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
    if (error.code === '23505') { // PostgreSQL unique violation error code
        return res.status(409).json({ message: 'Username or email already exists.' });
    }
    res.status(500).json({ message: 'Internal server error during registration' });
  }
});


// Protected Routes

router.get('/me', authenticateToken, async (req, res) => {
  console.log('Accessing /me route for user:', req.user);

  const { userId } = req.user;

  try {
    const getUserQuery = 'SELECT id, username, email FROM users WHERE id = $1';
    const { rows } = await pool.query(getUserQuery, [userId]);
    const userFromDb = rows[0];

    if (!userFromDb) {
      console.warn(`User with ID ${userId} from token not found in database.`);
      return res.status(404).json({ message: "User associated with token not found" });
    }
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

module.exports = router;
