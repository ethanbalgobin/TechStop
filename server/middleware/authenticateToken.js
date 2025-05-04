const jwt = require('jsonwebtoken');

/*
 * Middleware function to authenticate requests using JWT.
 * It checks for a token in the 'Authorization' header, verifies it,
 * and attaches the decoded user payload to the request object if valid.
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {function} next - The next middleware function in the stack.
 */

function authenticateToken(req, res, next) {
  
    // 1. Get the token from the Authorization header
    const authHeader = req.headers['authorization']; // Header names are case-insensitive in Node
    console.log(`[Auth Middleware] Authorization header value: ${authHeader}`); // Log the specific header value
  
    const token = authHeader && authHeader.split(' ')[1]; // Extract token part
    console.log(`[Auth Middleware] Extracted token: ${token}`); // Log the extracted token
  
    // 2. Check if token exists
    if (token == null) {
      console.log('[Auth Middleware] Token is null or undefined. Sending 401.'); // Log reason for 401
      return res.status(401).json({ message: 'Unauthorized: Access token is required' }); // Use 'Unauthorized' for missing token
    }
  
    // 3. Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedPayload) => {
      if (err) {
        console.error('[Auth Middleware] JWT Verification Error:', err.message);
        // Use 'Forbidden' for invalid/expired token
        return res.status(403).json({ message: 'Forbidden: Invalid or expired token' });
      }
  
      // 4. Token is valid! Attach payload and proceed
      console.log('[Auth Middleware] Token verified successfully. Payload:', decodedPayload);
      req.user = decodedPayload;
      next();
    });
  }
  
  module.exports = authenticateToken;