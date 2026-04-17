const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

// Add medicine
router.post('/', verifyToken, requireRole('admin', 'pharmacy'), async (req, res) => {
  try {
    const { name, category, manufacturer, unit, price, stock, minStock, expiryDate, description } = req.body;

    const medicine = {
      name, category,
      manufacturer: manufacturer || '',
      unit: unit || 'pcs',
      price: parseFloat(price),
      stock: parseInt(stock),
      minStock: parseInt(minStock) || 10,
      expiryDate: expiryDate || '',
      description: description || '',
      status: 'active',
      createdBy: req.user.uid,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('medicines').add(medicine);
    await db.collection('logs').add({
      action: 'MEDICINE_ADDED',
      targetId: docRef.id,
      targetName: name,
      performedBy: req.user.uid,
      performedByName: req.user.userData?.name || '',
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({ id: docRef.id, ...medicine });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all medicines
router.get('/', verifyToken, async (req, res) => {
  try {
    const { category, lowStock } = req.query;
    let query = db.collection('medicines').where('status', '==', 'active');
    const snap = await query.get();
    let medicines = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (category) medicines = medicines.filter(m => m.category === category);
    if (lowStock === 'true') medicines = medicines.filter(m => m.stock <= m.minStock);
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update medicine stock
router.patch('/:id/stock', verifyToken, requireRole('admin', 'pharmacy'), async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' | 'subtract'
    const doc = await db.collection('medicines').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Medicine not found' });

    const current = doc.data().stock;
    const newStock = operation === 'add' ? current + parseInt(quantity) : current - parseInt(quantity);

    if (newStock < 0) return res.status(400).json({ error: 'Insufficient stock' });

    await db.collection('medicines').doc(req.params.id).update({
      stock: newStock,
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: 'Stock updated', newStock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update medicine
router.put('/:id', verifyToken, requireRole('admin', 'pharmacy'), async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    await db.collection('medicines').doc(req.params.id).update(updates);
    res.json({ message: 'Medicine updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dispense medicine (create prescription fill)
router.post('/dispense', verifyToken, requireRole('pharmacy', 'admin'), async (req, res) => {
  try {
    const { prescriptionId, patientId, patientName, items, totalAmount } = req.body;
    // Deduct stock for each item
    const batch = db.batch();
    for (const item of items) {
      const medRef = db.collection('medicines').doc(item.medicineId);
      const medDoc = await medRef.get();
      if (!medDoc.exists) continue;
      const newStock = medDoc.data().stock - item.quantity;
      if (newStock < 0) return res.status(400).json({ error: `Insufficient stock for ${item.medicineName}` });
      batch.update(medRef, { stock: newStock });
    }
    await batch.commit();

    const dispense = {
      prescriptionId: prescriptionId || '',
      patientId, patientName, items,
      totalAmount: parseFloat(totalAmount),
      dispensedBy: req.user.uid,
      dispensedByName: req.user.userData?.name || '',
      dispensedAt: new Date().toISOString(),
      status: 'dispensed',
    };

    const docRef = await db.collection('dispensations').add(dispense);
    if (prescriptionId) {
  await db.collection('prescriptions').doc(prescriptionId).update({
    status: 'dispensed',
    dispensedAt: new Date().toISOString(),
  });
}
    await db.collection('revenue').add({
      type: 'pharmacy',
      amount: parseFloat(totalAmount),
      description: `Medicine dispensed to ${patientName}`,
      referenceId: docRef.id,
      createdBy: req.user.uid,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ id: docRef.id, ...dispense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
