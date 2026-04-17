const { auth, db } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;

    // Fetch role from Firestore
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (userDoc.exists) {
      req.user.role = userDoc.data().role;
      req.user.userData = userDoc.data();
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

module.exports = { verifyToken, requireRole };
