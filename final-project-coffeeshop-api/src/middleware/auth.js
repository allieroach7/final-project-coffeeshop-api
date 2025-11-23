// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import prisma from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Middleware: verify token and attach user to req.user
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Authorization header missing' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token missing' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ message: 'User not found' });
    // attach minimal user info
    req.user = { id: user.id, role: user.role, username: user.username };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token', error: err.message });
  }
}

// role-based middleware: accept array of roles
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    return next();
  };
}

// ownership check helper for resources that have user_id field
export function ownershipOrRole(resourceUserIdGetter, ...allowedRoles) {
  // resourceUserIdGetter: async (req) => <ownerId>
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (allowedRoles.includes(req.user.role)) return next(); // manager/admin allowed
    try {
      const ownerId = await resourceUserIdGetter(req);
      if (ownerId === req.user.id) return next();
      return res.status(403).json({ message: 'Forbidden: not owner' });
    } catch (err) {
      return res.status(500).json({ message: 'Ownership check failed', error: err.message });
    }
  };
}
