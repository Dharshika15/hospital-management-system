const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

// Record revenue/income
router.post('/', verifyToken, requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    const { type, amount, description, patientId, patientName, referenceId, paymentMethod } = req.body;

    const record = {
      type,
      amount: parseFloat(amount),
      description,
      patientId: patientId || '',
      patientName: patientName || '',
      referenceId: referenceId || '',
      paymentMethod: paymentMethod || 'cash',
      createdBy: req.user.uid,
      createdByName: req.user.userData?.name || '',
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    };

    const docRef = await db.collection('revenue').add(record);
    res.status(201).json({ id: docRef.id, ...record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record expense
router.post('/expense', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { category, amount, description, paymentMethod } = req.body;
    const expense = {
      category,
      amount: parseFloat(amount),
      description,
      paymentMethod: paymentMethod || 'cash',
      createdBy: req.user.uid,
      createdByName: req.user.userData?.name || '',
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    };
    const docRef = await db.collection('expenses').add(expense);
    res.status(201).json({ id: docRef.id, ...expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get revenue records
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    let query = db.collection('revenue');
    if (startDate) query = query.where('date', '>=', startDate);
    if (endDate) query = query.where('date', '<=', endDate);

    const snap = await query.orderBy('createdAt', 'desc').get();
    let records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (type) records = records.filter(r => r.type === type);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get expenses
router.get('/expenses', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const snap = await db.collection('expenses').orderBy('createdAt', 'desc').get();
    const expenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get financial summary
router.get('/summary', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    const [revSnap, expSnap, allRevSnap] = await Promise.all([
      db.collection('revenue').where('date', '>=', monthStart).get(),
      db.collection('expenses').where('date', '>=', monthStart).get(),
      db.collection('revenue').get(),
    ]);

    const monthRevenue = revSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
    const monthExpenses = expSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
    const totalRevenue = allRevSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);

    const todayRevSnap = await db.collection('revenue').where('date', '==', today).get();
    const todayRevenue = todayRevSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);

    // Revenue by type
    const byType = {};
    allRevSnap.docs.forEach(d => {
      const type = d.data().type || 'other';
      byType[type] = (byType[type] || 0) + d.data().amount;
    });

    res.json({
      todayRevenue,
      monthRevenue,
      monthExpenses,
      monthProfit: monthRevenue - monthExpenses,
      totalRevenue,
      revenueByType: byType,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create invoice
router.post('/invoice', verifyToken, requireRole('admin', 'receptionist', 'pharmacy', 'lab'), async (req, res) => {
  try {
    const { patientId, patientName, items, totalAmount, discount, paymentMethod, notes, source, invoiceType } = req.body;
    const invoiceNumber = 'INV-' + Date.now().toString().slice(-8);

    // Determine source: use provided source, or fall back to role
    const invoiceSource = source || invoiceType || req.user.userData?.role || 'admin';

    const invoice = {
      invoiceNumber,
      patientId, patientName, items,
      totalAmount: parseFloat(totalAmount),
      discount: parseFloat(discount) || 0,
      finalAmount: parseFloat(totalAmount) - (parseFloat(discount) || 0),
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
      source: invoiceSource,
      status: 'paid',
      createdBy: req.user.uid,
      createdByName: req.user.userData?.name || '',
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
    };

    const docRef = await db.collection('invoices').add(invoice);
    // Auto-record as revenue
    await db.collection('revenue').add({
      type: invoiceSource === 'lab' ? 'lab' : invoiceSource === 'pharmacy' ? 'pharmacy' : 'consultation',
      amount: invoice.finalAmount,
      description: `Invoice ${invoiceNumber} - ${patientName}`,
      patientId, patientName,
      referenceId: docRef.id,
      paymentMethod: invoice.paymentMethod,
      source: invoiceSource,
      createdBy: req.user.uid,
      createdAt: invoice.createdAt,
      date: invoice.date,
    });

    res.status(201).json({ id: docRef.id, ...invoice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get invoices
router.get('/invoices', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('invoices').orderBy('createdAt', 'desc').get();
    const invoices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
