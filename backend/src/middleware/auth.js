const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Payload contract: { user_id, role, iat, exp }
    if (!payload.user_id || !payload.role) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    req.user = { user_id: payload.user_id, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authenticateToken;
