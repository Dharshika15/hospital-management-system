/**
 * SEED SCRIPT — Run once to create your first admin user
 * Usage: node seed.js
 *
 * Make sure your .env is configured with Firebase credentials first.
 */
require('dotenv').config();
const { admin, db, auth } = require('./config/firebase');

async function seed() {
  const ADMIN_EMAIL = 'admin@medicore.com';
  const ADMIN_PASSWORD = 'Admin@123456';
  const ADMIN_NAME = 'Dharshika';

  console.log('🌱 Seeding initial admin user...');

  try {
    // Create Firebase Auth user
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: ADMIN_NAME,
      });
      console.log('✅ Firebase Auth user created:', userRecord.uid);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
        console.log('ℹ️  Auth user already exists:', userRecord.uid);
      } else {
        throw err;
      }
    }

    // Write to Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: 'admin',
      phone: '+91 9999999999',
      specialty: '',
      licenseNumber: '',
      status: 'active',
      createdAt: new Date().toISOString(),
    }, { merge: true });

    console.log('✅ Firestore user document created');

    // Seed sample doctor
    const doctorEmail = 'doctor@medicore.com';
    let doctorRecord;
    try {
      doctorRecord = await auth.createUser({
        email: doctorEmail,
        password: 'Doctor@123456',
        displayName: 'Dr. Priya Sharma',
      });
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        doctorRecord = await auth.getUserByEmail(doctorEmail);
      } else throw err;
    }

    await db.collection('users').doc(doctorRecord.uid).set({
      uid: doctorRecord.uid,
      email: doctorEmail,
      name: 'Dr. Priya Sharma',
      role: 'doctor',
      phone: '+91 9888888888',
      specialty: 'General Medicine',
      licenseNumber: 'MCI-2024-0001',
      status: 'active',
      createdAt: new Date().toISOString(),
    }, { merge: true });

    // Seed pharmacist
    const pharmacyEmail = 'pharmacy@medicore.com';
    let pharmacyRecord;
    try {
      pharmacyRecord = await auth.createUser({
        email: pharmacyEmail,
        password: 'Pharmacy@123456',
        displayName: 'Dharaneeswari',
      });
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        pharmacyRecord = await auth.getUserByEmail(pharmacyEmail);
      } else throw err;
    }

    await db.collection('users').doc(pharmacyRecord.uid).set({
      uid: pharmacyRecord.uid,
      email: pharmacyEmail,
      name: 'Dharaneeswari',
      role: 'pharmacy',
      phone: '+91 9777777777',
      specialty: '',
      licenseNumber: '',
      status: 'active',
      createdAt: new Date().toISOString(),
    }, { merge: true });

    // Seed receptionist
    const receptionistEmail = 'reception@medicore.com';
    let receptionistRecord;
    try {
      receptionistRecord = await auth.createUser({
        email: receptionistEmail,
        password: 'Reception@123456',
        displayName: 'Ruba',
      });
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        receptionistRecord = await auth.getUserByEmail(receptionistEmail);
      } else throw err;
    }

    await db.collection('users').doc(receptionistRecord.uid).set({
      uid: receptionistRecord.uid,
      email: receptionistEmail,
      name: 'Ruba',
      role: 'receptionist',
      phone: '+91 9666666666',
      specialty: '',
      licenseNumber: '',
      status: 'active',
      createdAt: new Date().toISOString(),
    }, { merge: true });
    // Seed lab technician
const labEmail = 'lab@medicore.com';
let labRecord;

try {
  labRecord = await auth.createUser({
    email: labEmail,
    password: 'Lab@123456',
    displayName: 'Kavya LabTech',
  });
} catch (err) {
  if (err.code === 'auth/email-already-exists') {
    labRecord = await auth.getUserByEmail(labEmail);
  } else throw err;
}

await db.collection('users').doc(labRecord.uid).set({
  uid: labRecord.uid,
  email: labEmail,
  name: 'Kavya LabTech',
  role: 'lab', 
  phone: '+91 9555555555',
  specialty: 'Diagnostics',
  licenseNumber: '',
  status: 'active',
  createdAt: new Date().toISOString(),
}, { merge: true });

console.log('✅ Lab technician seeded');

    // Seed sample medicines
    const medicines = [
      { name: 'Amoxicillin 500mg', category: 'Antibiotic', manufacturer: 'Cipla', unit: 'capsule', price: 8.5, stock: 500, minStock: 50, expiryDate: '2026-12-31' },
      { name: 'Paracetamol 500mg', category: 'Analgesic', manufacturer: 'Sun Pharma', unit: 'tablet', price: 2.0, stock: 1000, minStock: 100, expiryDate: '2027-06-30' },
      { name: 'Azithromycin 250mg', category: 'Antibiotic', manufacturer: 'Cipla', unit: 'tablet', price: 22.0, stock: 200, minStock: 30, expiryDate: '2026-09-30' },
      { name: 'Metformin 500mg', category: 'Diabetes', manufacturer: 'Dr. Reddy\'s', unit: 'tablet', price: 5.0, stock: 300, minStock: 40, expiryDate: '2026-08-31' },
      { name: 'Atorvastatin 10mg', category: 'Cardiovascular', manufacturer: 'Lupin', unit: 'tablet', price: 12.0, stock: 8, minStock: 30, expiryDate: '2026-11-30' },
      { name: 'Cetirizine 10mg', category: 'Antihistamine', manufacturer: 'Mankind', unit: 'tablet', price: 3.5, stock: 400, minStock: 50, expiryDate: '2027-01-31' },
      { name: 'Omeprazole 20mg', category: 'Supplement', manufacturer: 'Zydus', unit: 'capsule', price: 7.0, stock: 0, minStock: 25, expiryDate: '2026-10-31' },
      { name: 'Vitamin D3 1000IU', category: 'Vitamin', manufacturer: 'Abbott', unit: 'tablet', price: 15.0, stock: 150, minStock: 20, expiryDate: '2027-03-31' },
    ];

    const batch = db.batch();
    for (const med of medicines) {
      const ref = db.collection('medicines').doc();
      batch.set(ref, {
        ...med,
        status: 'active',
        createdBy: userRecord.uid,
        createdAt: new Date().toISOString(),
        description: '',
      });
    }
    await batch.commit();
    console.log(`✅ Seeded ${medicines.length} medicines`);

    // Seed sample patients
    const patients = [
      { name: 'Ravi Krishnan', age: 45, gender: 'Male', phone: '9876543210', bloodGroup: 'B+', email: 'ravi@example.com', address: 'Chennai, Tamil Nadu' },
      { name: 'Meena Devi', age: 32, gender: 'Female', phone: '9765432109', bloodGroup: 'O+', email: 'meena@example.com', address: 'Madurai, Tamil Nadu' },
      { name: 'Suresh Babu', age: 58, gender: 'Male', phone: '9654321098', bloodGroup: 'A+', email: '', address: 'Coimbatore, Tamil Nadu' },
      { name: 'Lakshmi R.', age: 27, gender: 'Female', phone: '9543210987', bloodGroup: 'AB-', email: 'lakshmi@example.com', address: 'Salem, Tamil Nadu' },
    ];

    const patientBatch = db.batch();
    for (let i = 0; i < patients.length; i++) {
      const ref = db.collection('patients').doc();
      patientBatch.set(ref, {
        ...patients[i],
        patientId: `PAT-${String(i + 1).padStart(4, '0')}`,
        allergies: [],
        medicalHistory: '',
        emergencyContact: '',
        status: 'active',
        registeredBy: receptionistRecord.uid,
        registeredByName: 'Anita Singh',
        createdAt: new Date().toISOString(),
      });
    }
    await patientBatch.commit();
    console.log(`✅ Seeded ${patients.length} patients`);

    console.log('\n🎉 Seed complete! Login credentials:');
    console.log('─────────────────────────────────────');
    console.log(`👑 Admin        → ${ADMIN_EMAIL} / Admin@123456`);
    console.log(`🩺 Doctor       → doctor@medicore.com / Doctor@123456`);
    console.log(`💊 Pharmacy     → pharmacy@medicore.com / Pharmacy@123456`);
    console.log(`📋 Receptionist → reception@medicore.com / Reception@123456`);
    console.log(`🧪 Lab          → lab@medicore.com / Lab@123456`);
    console.log('─────────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
