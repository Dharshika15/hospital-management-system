const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// CREATE LAB TEST + ADD REVENUE
router.post('/test', async (req, res) => {
  try {
    const { patientId, testName, amount } = req.body;

    // 1. Save lab test
    const testRef = db.collection('labTests').doc();
    await testRef.set({
      patientId,
      testName,
      amount,
      status: 'completed',
      createdAt: new Date().toISOString(),
    });

    // 2. ADD TO FINANCE 💰
    const financeRef = db.collection('finance').doc();
    await financeRef.set({
      type: 'lab',
      amount,
      source: 'lab test',
      referenceId: testRef.id,
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;