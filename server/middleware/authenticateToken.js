const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  
  // token from authHeader
    const authHeader = req.headers['authorization']; 
    console.log(`[Auth Middleware] Authorization header value: ${authHeader}`);
  
    const token = authHeader && authHeader.split(' ')[1]; 
    console.log(`[Auth Middleware] Extracted token: ${token}`); 
  
    if (token == null) {
      console.log('[Auth Middleware] Token is null or undefined: 401.');
      return res.status(401).json({ message: 'Unauthorized: Access token is required' });
    }
  
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedPayload) => {
      if (err) {
        console.error('[Auth Middleware] 403 JWT Verification Error:', err.message);
        return res.status(403).json({ message: 'Forbidden: Invalid or expired token' });
      }

      // valid token
      console.log('[Auth Middleware] Token verified successfully. Payload:', decodedPayload);
      req.user = decodedPayload;
      next();
    });
  }
  
  module.exports = authenticateToken;