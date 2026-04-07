const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    });

    if (!user || !user.isActive) return res.status(401).json({ error: 'User not found or inactive' });

    req.user = user;
    req.permissions = user.role.permissions.map(rp => rp.permission.slug);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (req.user.role.name === 'admin') return next(); // Admin bypasses all
    const hasPermission = requiredPermissions.some(p => req.permissions.includes(p));
    if (!hasPermission) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
};

const logActivity = async (userId, action, entityType, entityId, details, ipAddress) => {
  try {
    await prisma.activityLog.create({
      data: { userId, action, entityType, entityId, details: details ? JSON.stringify(details) : null, ipAddress }
    });
  } catch (err) {
    console.error('Activity log error:', err);
  }
};

module.exports = { authenticate, authorize, logActivity, prisma };
