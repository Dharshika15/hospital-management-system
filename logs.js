const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const snap = await db.collection('logs').orderBy('timestamp', 'desc').limit(200).get();
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
