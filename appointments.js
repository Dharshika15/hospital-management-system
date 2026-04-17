const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

// Create appointment
router.post('/', verifyToken, requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    const { patientId, patientName, doctorId, doctorName, date, time, type, notes, fee, patientEmail } = req.body;

    const appointment = {
      patientId, patientName, 
      patientEmail: patientEmail || '',
      doctorId, doctorName,
      date, time, type: type || 'General',
      notes: notes || '',
      fee: parseFloat(fee) || 0,
      status: 'scheduled',
      createdBy: req.user.uid,
      createdByName: req.user.userData?.name || '',
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('appointments').add(appointment);
    await db.collection('logs').add({
      action: 'APPOINTMENT_CREATED',
      targetId: docRef.id,
      targetName: `${patientName} → ${doctorName}`,
      performedBy: req.user.uid,
      performedByName: req.user.userData?.name || '',
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({ id: docRef.id, ...appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get appointments
router.get('/', verifyToken, async (req, res) => {
  try {
    const { date, status } = req.query;

    // Get ALL appointments first, then filter in code
    // This avoids Firestore composite index requirement
    const snap = await db.collection('appointments').get();
    let appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter by doctor if role is doctor
    if (req.user.role === 'doctor') {
      appointments = appointments.filter(a => a.doctorId === req.user.uid);
    }

    // Filter by date if provided
    if (date) {
      appointments = appointments.filter(a => a.date === date);
    }

    // Filter by status if provided
    if (status) {
      appointments = appointments.filter(a => a.status === status);
    }

    // Sort by createdAt descending
    appointments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(appointments);
  } catch (err) {
    console.error('Appointments error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update appointment status
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status, notes, time, delayReason } = req.body;
    const updates = { status, updatedAt: new Date().toISOString() };
    if (notes) updates.doctorNotes = notes;
    if (time) updates.time = time;
    if (delayReason) updates.delayReason = delayReason;
    await db.collection('appointments').doc(req.params.id).update(updates);
    res.json({ message: 'Appointment updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel appointment
router.delete('/:id', verifyToken, requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    await db.collection('appointments').doc(req.params.id).update({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: req.user.uid,
    });
    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;