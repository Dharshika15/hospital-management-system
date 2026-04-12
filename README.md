# 🏥 MediCore HMS — Hospital Management System

A full-stack, production-grade Hospital Management System built with **React**, **Node.js/Express**, and **Firebase** (Firestore + Auth + Realtime DB).

---

## ✨ Features

### 4 Role-Based Portals
| Role | Capabilities |
|------|-------------|
| **Admin** | Full system access: staff management, finance, revenue reports, invoices, logs, all modules |
| **Doctor** | Appointments, patients, write prescriptions |
| **Pharmacy** | Medicine inventory, dispense prescriptions, stock alerts |
| **Receptionist** | Register patients, schedule appointments, create invoices |

### Modules
- 📊 **Dashboard** — Role-specific KPIs, revenue charts, appointment overview
- 👥 **Patient Management** — Register, search, view patient profiles with medical history
- 📅 **Appointments** — Schedule, filter, update status; doctor-aware
- 💊 **Medicine Inventory** — CRUD, stock tracking, low-stock alerts
- 📝 **Prescriptions** — Doctors write Rx with multi-medicine support
- 💉 **Dispense** — Pharmacy processes pending prescriptions, auto-deducts stock
- 💰 **Finance** — Revenue tracking, expense recording, invoice generation
- 🧾 **Invoices** — Itemized billing, payment method tracking
- 📋 **Activity Logs** — Full audit trail for admin
- 🔐 **Auth** — Firebase Auth with role-based route protection

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Firebase project

### Step 1 — Firebase Setup
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. **Enable Authentication** → Sign-in method → Email/Password
4. **Enable Firestore Database** (start in test mode initially)
5. **Enable Realtime Database** (optional, for future real-time features)
6. Go to **Project Settings → Service Accounts** → Generate new private key (for backend)
7. Go to **Project Settings → General → Your apps** → Add web app (for frontend)

### Step 2 — Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your Firebase service account credentials:
```
PORT=5000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
FRONTEND_URL=http://localhost:3000
```

```bash
npm install

# Seed initial users and sample data
node seed.js

# Start the API server
npm run dev
```

### Step 3 — Frontend Setup

```bash
cd frontend
cp .env.example .env
```

Edit `.env` with your Firebase web app config:
```
REACT_APP_FIREBASE_API_KEY=AIza...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
REACT_APP_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
REACT_APP_API_URL=http://localhost:5000/api
```

```bash
npm install
npm start
```

### Step 4 — Login

After running `seed.js`, use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@medicore.com | Admin@123456 |
| Doctor | doctor@medicore.com | Doctor@123456 |
| Pharmacy | pharmacy@medicore.com | Pharmacy@123456 |
| Receptionist | reception@medicore.com | Reception@123456 |

---

## 🔒 Security

### Firestore Rules
Deploy the included `firestore.rules` file:
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

---

## 🏗 Architecture

```
Client (React) ←→ Backend API (Express) ←→ Firebase Admin SDK ←→ Firestore
     ↕                                                               ↕
Firebase Auth                                                  Realtime DB
(JWT tokens)
```

- Frontend talks to Firebase Auth directly for login/logout
- Every API request includes a Firebase ID token in the `Authorization` header
- Backend verifies the token and checks the user's role from Firestore
- All business logic and sensitive operations go through the backend

---

## 📁 Project Structure

```
hospital-management/
├── backend/
│   ├── config/
│   │   └── firebase.js          # Firebase Admin SDK init
│   ├── middleware/
│   │   └── auth.js              # Token verification + role guard
│   ├── routes/
│   │   ├── users.js             # Staff management API
│   │   ├── patients.js          # Patient CRUD
│   │   ├── appointments.js      # Appointment scheduling
│   │   ├── medicines.js         # Inventory + dispensing
│   │   ├── finance.js           # Revenue, expenses, invoices
│   │   ├── prescriptions.js     # Doctor prescriptions
│   │   └── logs.js              # Audit logs
│   ├── seed.js                  # Initial data seeder
│   ├── server.js                # Express app entry
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── components/
│       │   ├── auth/
│       │   │   └── Login.js
│       │   ├── shared/
│       │   │   ├── Sidebar.js
│       │   │   ├── Layout.js
│       │   │   └── ProtectedRoute.js
│       │   ├── dashboard/
│       │   │   └── Dashboard.js      # Role-adaptive dashboard
│       │   ├── admin/
│       │   │   ├── StaffManagement.js
│       │   │   ├── Finance.js
│       │   │   ├── Doctors.js
│       │   │   └── Logs.js
│       │   ├── receptionist/
│       │   │   ├── Patients.js
│       │   │   ├── Appointments.js
│       │   │   └── Invoices.js
│       │   ├── doctor/
│       │   │   └── Prescriptions.js
│       │   └── pharmacy/
│       │       ├── Medicines.js
│       │       └── Dispense.js
│       ├── contexts/
│       │   └── AuthContext.js        # Firebase auth context
│       ├── utils/
│       │   └── api.js               # Axios with auto token
│       ├── styles/
│       │   └── global.css           # Full design system
│       ├── firebase.js              # Firebase client init
│       ├── App.js                   # Router + route protection
│       └── index.js
│
├── firestore.rules                  # Security rules
├── firestore.indexes.json           # Compound query indexes
├── firebase.json                    # Firebase hosting config
└── README.md
```

---

## 🚢 Deployment

### Backend (Render / Railway / Heroku)
1. Push to GitHub
2. Connect to Render/Railway
3. Set environment variables
4. Deploy

### Frontend (Firebase Hosting)
```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, React Router v6 |
| Styling | Pure CSS with CSS Variables (dark theme) |
| Charts | Recharts |
| Icons | Lucide React |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| Backend | Node.js, Express |
| API Auth | Firebase Admin SDK (JWT) |
| HTTP Client | Axios |
| Toasts | React Hot Toast |

---

## 📄 License
MIT — Free to use for personal and commercial projects.
