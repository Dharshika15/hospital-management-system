const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Register patient (receptionist, admin)
router.post('/', verifyToken, requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    const { name, age, gender, phone, email, address, bloodGroup, emergencyContact, allergies, medicalHistory } = req.body;
    const patientId = 'PAT-' + Date.now().toString().slice(-6);

    const patient = {
      patientId,
      name, age, gender, phone,
      email: email || '',
      address: address || '',
      bloodGroup: bloodGroup || '',
      emergencyContact: emergencyContact || '',
      allergies: allergies || [],
      medicalHistory: medicalHistory || '',
      status: 'active',
      registeredBy: req.user.uid,
      registeredByName: req.user.userData?.name || '',
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('patients').add(patient);
    await db.collection('logs').add({
      action: 'PATIENT_REGISTERED',
      targetId: docRef.id,
      targetName: name,
      performedBy: req.user.uid,
      performedByName: req.user.userData?.name || '',
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({ id: docRef.id, ...patient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all patients
router.get('/', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection('patients').orderBy('createdAt', 'desc').get();
    const patients = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single patient
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('patients').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Patient not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update patient
router.put('/:id', verifyToken, requireRole('admin', 'receptionist', 'doctor'), async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    await db.collection('patients').doc(req.params.id).update(updates);
    res.json({ message: 'Patient updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get patient appointments
router.get('/:id/appointments', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('appointments').where('patientId', '==', req.params.id).orderBy('date', 'desc').get();
    const appts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(appts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
