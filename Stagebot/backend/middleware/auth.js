// middleware/auth.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  try {
    const token = header.split('Bearer ')[1];
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

module.exports = authMiddleware;
