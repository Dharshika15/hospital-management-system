const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

// Create prescription
router.post('/', verifyToken, requireRole('doctor', 'admin'), async (req, res) => {
  try {
    const { patientId, patientName, appointmentId, diagnosis, medicines, instructions, followUpDate } = req.body;

    const prescription = {
      patientId, patientName,
      appointmentId: appointmentId || '',
      doctorId: req.user.uid,
      doctorName: req.user.userData?.name || '',
      diagnosis,
      medicines,
      instructions: instructions || '',
      followUpDate: followUpDate || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('prescriptions').add(prescription);
    await db.collection('logs').add({
      action: 'PRESCRIPTION_CREATED',
      targetId: docRef.id,
      targetName: `Prescription for ${patientName}`,
      performedBy: req.user.uid,
      performedByName: req.user.userData?.name || '',
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({ id: docRef.id, ...prescription });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get prescriptions
router.get('/', verifyToken, async (req, res) => {
  try {
    const { patientId, status } = req.query;

    // Get ALL prescriptions first then filter in code
    // Avoids Firestore composite index requirement
    const snap = await db.collection('prescriptions').get();
    let prescriptions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter by doctor if role is doctor
    if (req.user.role === 'doctor') {
      prescriptions = prescriptions.filter(p => p.doctorId === req.user.uid);
    }

    // Filter by patientId if provided
    if (patientId) {
      prescriptions = prescriptions.filter(p => p.patientId === patientId);
    }

    // Filter by status if provided
    if (status) {
      prescriptions = prescriptions.filter(p => p.status === status);
    }

    // Sort by createdAt descending
    prescriptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(prescriptions);
  } catch (err) {
    console.error('Prescriptions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single prescription
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('prescriptions').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update prescription (general)
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    await db.collection('prescriptions').doc(req.params.id).update({
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
    res.json({ message: 'Prescription updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update prescription status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    await db.collection('prescriptions').doc(req.params.id).update({
      status,
      updatedAt: new Date().toISOString(),
    });
    res.json({ message: 'Prescription updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;