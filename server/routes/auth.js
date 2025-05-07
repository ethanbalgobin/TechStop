const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();
const saltRounds = 10;

// Auth Routes

// registration
router.post('/register', async (req, res) => {
    const { username, email, password, first_name, last_name } = req.body;
    console.log('[Auth Router] Registration attempt for:', email);
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email and password are required.' });
    }
    try {
        const checkUserQuery = 'SELECT id FROM users WHERE username = $1 OR email = $2';
        const { rows: existingRows } = await pool.query(checkUserQuery, [username, email]);
        if (existingRows.length > 0) {
            return res.status(409).json({ error: 'Username or email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const insertQuery = `
            INSERT INTO users (username, email, password_hash, first_name, last_name, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id, username, email;
        `;
        const values = [username, email, hashedPassword, first_name || null, last_name || null];
        const result = await pool.query(insertQuery, values);
        const newUser = result.rows[0];
        console.log('[Auth Router] User registered successfully:', newUser.email);
        res.status(201).json({
            message: 'User registered successfully!',
            user: { id: newUser.id, username: newUser.username, email: newUser.email }
        });
    } catch(err) {
        if(err.code === '23505') {
            console.error('[Auth Router] Registration Error: Username or email already exists.', err.detail);
            return res.status(409).json({ error: 'Username or email already exists.' });
        }
        console.error('[Auth Router] Error during registration:', err.stack);
        res.status(500).json({ error: 'Internal Server Error during registration' });
    }
});


// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('[Auth Router] Login attempt for:', email);
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        const queryText = 'SELECT id, username, email, password_hash, is_2fa_enabled, is_admin FROM users WHERE email = $1';
        const result = await pool.query(queryText, [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        if (user.is_2fa_enabled) {
            console.log(`[Auth Router] 2FA required for user ID: ${user.id}`);
            res.status(200).json({ requires2FA: true, userId: user.id });
        } else {
            console.log(`[Auth Router] Login successful (2FA not enabled) for user ID: ${user.id}`);
            const payload = { userId: user.id, username: user.username };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.status(200).json({
                message: 'Login Successful!',
                token: token,
                user: { // --- MODIFIED: Return full user object needed by context ---
                    id: user.id, username: user.username, email: user.email,
                    is_admin: user.is_admin, is_2fa_enabled: user.is_2fa_enabled
                }
            });
        }
    } catch (err) {
        console.error('[Auth Router] Error during login:', err.stack);
        res.status(500).json({ error: 'Internal Server Error during login.' });
    }
});

// verifying 2fa login
router.post('/verify-2fa', async (req, res) => {
    const { userId, totpCode } = req.body;
    console.log(`[Auth Router] Verifying 2FA code for user ID: ${userId}`);
    if (!userId || !totpCode) {
        return res.status(400).json({ error: 'User ID and 2FA code are required.' });
    }
    try {
        const queryText = 'SELECT id, username, email, totp_secret, is_admin, is_2fa_enabled FROM users WHERE id = $1 AND is_2fa_enabled = TRUE;';
        const { rows } = await pool.query(queryText, [userId]);
        if (rows.length === 0) { return res.status(401).json({ error: 'Invalid user or 2FA not enabled.' }); }
        const user = rows[0];
        if (!user.totp_secret) { return res.status(500).json({ error: 'Server configuration error for 2FA.' }); }

        const verified = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token: totpCode, window: 1 });

        if (verified) {
            console.log(`[Auth Router] 2FA code verified for user ID: ${userId}. Issuing token.`);
            const payload = { userId: user.id, username: user.username };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.status(200).json({
                message: 'Login Successful!', token: token,
                user: { // --- MODIFIED: Return full user object ---
                    id: user.id, username: user.username, email: user.email,
                    is_admin: user.is_admin, is_2fa_enabled: user.is_2fa_enabled
                }
            });
        } else {
            console.log(`[Auth Router] Invalid 2FA code for user ID: ${userId}`);
            res.status(401).json({ error: 'Invalid 2FA code.' });
        }
    } catch (error) {
        console.error(`[Auth Router] Error verifying 2FA for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error during 2FA verification.' });
    }
});

// User Profile
router.get('/me', authenticateToken, async (req, res) => {
    console.log('[Auth Router] Accessing /me route for user:', req.user);
    const { userId } = req.user;
    try {
        const getUserQuery = `
            SELECT id, username, email, first_name, last_name, is_2fa_enabled, is_admin
            FROM users WHERE id = $1;
        `;
        const { rows } = await pool.query(getUserQuery, [userId]);
        const userFromDb = rows[0];
        if (!userFromDb) {
            return res.status(404).json({ message: "User associated with token not found" });
        }
        console.log(`[Auth Router] Returning profile for user ID ${userId}, 2FA enabled: ${userFromDb.is_2fa_enabled}, Admin: ${userFromDb.is_admin}`);
        res.status(200).json({
            id: userFromDb.id, username: userFromDb.username, email: userFromDb.email,
            first_name: userFromDb.first_name, last_name: userFromDb.last_name,
            is_2fa_enabled: userFromDb.is_2fa_enabled, is_admin: userFromDb.is_admin
        });
    } catch (error) {
        console.error('[Auth Router] Error fetching user details:', error.stack);
        res.status(500).json({ message: 'Internal server error fetching user details' });
    }
});

// Generate 2FA Secret and QR Code
router.post('/2fa/generate', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const username = req.user.username;
    if (!username) {
        console.warn(`[Auth Router] Username not found in token payload for user ID: ${userId}. Using email as fallback for 2FA label.`);
        try {
            const {rows} = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
            if (rows.length === 0) throw new Error('User not found');
            username = rows[0].email;
        } catch (e) {
            return res.status(404).json({ error: 'User not found for 2FA setup.' });
        }
    }
    console.log(`[Auth Router] Generating 2FA secret for user ID: ${userId}`);
    try {
        const secret = speakeasy.generateSecret({ name: `TechStop (${username})`, issuer: 'TechStop' });
        qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) {
                console.error('[Auth Router] QR Code generation error:', err);
                return res.status(500).json({ error: 'Could not generate QR code.' });
            }
            console.log(`[Auth Router] QR Code generated for user ID: ${userId}`);
            res.json({ secret: secret.base32, qrCodeUrl: data_url, otpauthUrl: secret.otpauth_url });
        });
    } catch (error) {
        console.error(`[Auth Router] Error generating 2FA secret for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error generating 2FA secret.' });
    }
});

// Verify TOTP Token and Enable 2FA
router.post('/2fa/verify', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { token, secret } = req.body;
    console.log(`[Auth Router] Verifying 2FA setup token for user ID: ${userId}`);
    if (!token || !secret) {
        return res.status(400).json({ error: 'Token code and secret are required.' });
    }
    try {
        const verified = speakeasy.totp.verify({ secret: secret, encoding: 'base32', token: token, window: 1 });
        if (verified) {
            console.log(`[Auth Router] 2FA token verified successfully for user ID: ${userId}`);
            const updateQuery = `UPDATE users SET is_2fa_enabled = TRUE, totp_secret = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`;
            await pool.query(updateQuery, [secret, userId]);
            console.log(`[Auth Router] 2FA enabled and secret saved for user ID: ${userId}`);
            res.json({ verified: true, message: '2FA enabled successfully!' });
        } else {
            console.log(`[Auth Router] 2FA token verification failed for user ID: ${userId}`);
            res.status(400).json({ verified: false, error: 'Invalid 2FA code.' });
        }
    } catch (error) {
        console.error(`[Auth Router] Error verifying 2FA token for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error verifying 2FA token.' });
    }
});

// Disable 2FA
router.post('/2fa/disable', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { password } = req.body;
    console.log(`[Auth Router] Attempting to disable 2FA for user ID: ${userId}`);
    if (!password) {
        return res.status(400).json({ error: 'Password is required to disable 2FA.' });
    }
    try {
        const userQuery = 'SELECT id, password_hash, is_2fa_enabled FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [userId]);
        if (userResult.rows.length === 0) { return res.status(404).json({ error: 'User not found.' }); }
        const user = userResult.rows[0];
        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordMatch) { return res.status(401).json({ error: 'Incorrect password.' }); }

        if (user.is_2fa_enabled) {
            const updateQuery = `UPDATE users SET is_2fa_enabled = FALSE, totp_secret = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1;`;
            await pool.query(updateQuery, [userId]);
            console.log(`[Auth Router] 2FA disabled successfully for user ID: ${userId}`);
            res.json({ message: 'Two-Factor Authentication has been disabled.' });
        } else {
            console.log(`[Auth Router] 2FA already disabled for user ID: ${userId}`);
            res.json({ message: 'Two-Factor Authentication is already disabled.' });
        }
    } catch (error) {
        console.error(`[Auth Router] Error disabling 2FA for user ID ${userId}:`, error.stack);
        res.status(500).json({ error: 'Internal Server Error disabling 2FA.' });
    }
});

module.exports = router;
