const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 

const pool = require('../db')
const authenticateToken = require('../middleware/authenticateToken');

const SALT_ROUNDS = 10; 


// --- Removed Routes ---
// POST /login - Moved to auth.js
// POST /register - Moved to auth.js
// GET /me - Moved to auth.js

// --- Placeholder for Future User Routes ---

/* PUT /api/users/me/profile (Update user's own profile)
 router.put('/me/profile', authenticateToken, async (req, res) => {
   const userId = req.user.userId;
   const { first_name, last_name, other updatable fields } = req.body;
    -- validation --
   try {
      UPDATE query
      Execute query
     res.json({ message: 'Profile updated successfully' });
   } catch (error) {
     console.error('Error updating profile:', error);
     res.status(500).json({ error: 'Failed to update profile' });
   }
 });

 PUT /api/users/me/password (Change user's own password)
 router.put('/me/password', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
     -- validation --
     Fetch current hash, verify currentPassword, hash newPassword, UPDATE
 });

module.exports = router; */
