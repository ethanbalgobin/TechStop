const pool = require('../db');

const authenticateAdmin = async (req, res, next) => {
    if (!req.user || !req.user.userId) {
        console.warn('[Admin Middleware] No user found on request. Ensure authenticateToken runs first.');
        return res.status(401).json({ error: 'Authentication required.' }); // 401 Unauthorised
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

module.exports = authenticateAdmin;
