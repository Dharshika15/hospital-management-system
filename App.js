import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Layout from './components/shared/Layout';
import RoleSelect from './components/auth/RoleSelect';
import Dashboard from './components/dashboard/Dashboard';
import AdminDoctors from './components/admin/AdminDoctors';
import LeaveCalendar from './components/admin/LeaveCalendar';
import Finance from './components/admin/Finance';
import Logs from './components/admin/Logs';
import DoctorAppointments from './components/doctor/DoctorAppointments';
import Prescriptions from './components/doctor/Prescriptions';
import Patients from './components/receptionist/Patients';
import PharmacyDashboard from './components/pharmacy/PharmacyDashboard';
import Dispense from './components/pharmacy/Dispense';
import Appointments from './components/receptionist/Appointments';
import Invoices from './components/receptionist/Invoices';
import LabDashboard from './components/lab/LabDashboard';
import BedManagement from './components/beds/BedManagement';
import TokenSystem from './components/token/TokenSystem';
import DoctorRevenueReport from './components/admin/DoctorRevenueReport';
import './styles/global.css';

const META = {
  '/dashboard':           { title: 'Dashboard',              subtitle: 'Overview and analytics' },
  '/appointments':        { title: 'Appointments',            subtitle: 'Manage your appointments' },
  '/patients':            { title: 'Patients',                subtitle: 'Patient records' },
  '/prescriptions':       { title: 'Prescriptions',           subtitle: 'Medical prescriptions' },
  '/pharmacy':            { title: 'Pharmacy',                subtitle: 'Medicines, stock & invoices' },
  '/dispense':            { title: 'Dispense Medicines',      subtitle: 'Process prescriptions' },
  '/reception/invoices':  { title: 'Consultation Invoices',   subtitle: 'Create and manage consultation invoices' },
  '/reception/tokens':    { title: 'OPD Token Queue',         subtitle: 'Issue and manage patient tokens' },
  '/lab':                 { title: 'Lab & Diagnostics',       subtitle: 'Tests, scans and reports' },
  '/beds':                { title: 'Bed Management',          subtitle: 'Ward beds and admissions' },
  '/tokens':              { title: 'OPD Token Queue',         subtitle: 'Doctor token calling' },
  '/admin/doctors':       { title: 'Doctors Management',      subtitle: 'Add and manage doctors' },
  '/leave-calendar': { title: 'Leave Calendar',         subtitle: 'Doctor availability & leave management' },
  '/finance':             { title: 'Finance & Revenue',       subtitle: 'Financial reports' },
  '/logs':                { title: 'Activity Logs',           subtitle: 'System audit trail' },
  '/finance/doctors': { title: 'Doctor Revenue', subtitle: 'Revenue breakdown by doctor' },
};

function Page({ path, roles, children }) {
  const meta = META[path] || {};
  return (
    <ProtectedRoute roles={roles}>
      <Layout title={meta.title} subtitle={meta.subtitle}>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{
            style: { background: '#ffffff', color: '#0f172a', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', fontSize: '0.875rem', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, boxShadow: '0 4px 16px rgba(99,102,241,0.12)' },
            success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' }, style: { borderLeft: '4px solid #10b981' } },
            error: { iconTheme: { primary: '#f43f5e', secondary: '#ffffff' }, style: { borderLeft: '4px solid #f43f5e' } },
          }} />
          <Routes>
            <Route path="/login" element={<RoleSelect />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route path="/dashboard" element={<Page path="/dashboard"><Dashboard /></Page>} />

            {/* Admin */}
            <Route path="/admin/doctors" element={<Page path="/admin/doctors" roles={['admin']}><AdminDoctors /></Page>} />
            <Route path="/leave-calendar" element={<Page path="/leave-calendar" roles={['receptionist']}><LeaveCalendar /></Page>} />
            <Route path="/finance" element={<Page path="/finance" roles={['admin']}><Finance /></Page>} />
            <Route path="/logs" element={<Page path="/logs" roles={['admin']}><Logs /></Page>} />
            <Route path="/finance/doctors"element={<Page path="/finance/doctors" roles={['admin']}><DoctorRevenueReport /></Page>
      }
    />

            {/* Doctor */}
            <Route path="/appointments" element={<Page path="/appointments" roles={['doctor', 'receptionist', 'admin']}><DoctorAppointments /></Page>} />
            <Route path="/patients" element={<Page path="/patients" roles={['doctor', 'receptionist', 'admin']}><Patients /></Page>} />
            <Route path="/prescriptions" element={<Page path="/prescriptions" roles={['doctor', 'pharmacy', 'admin']}><Prescriptions /></Page>} />
            <Route path="/tokens" element={<Page path="/tokens" roles={['doctor', 'admin']}><TokenSystem /></Page>} />

            {/* Pharmacy */}
            <Route path="/pharmacy" element={<Page path="/pharmacy" roles={['pharmacy', 'admin']}><PharmacyDashboard /></Page>} />
            <Route path="/dispense" element={<Page path="/dispense" roles={['pharmacy', 'admin']}><Dispense /></Page>} />

            {/* Receptionist */}
            <Route path="/reception/appointments" element={<Page path="/appointments" roles={['receptionist', 'admin']}><Appointments /></Page>} />
            <Route path="/reception/invoices" element={<Page path="/reception/invoices" roles={['receptionist', 'admin']}><Invoices /></Page>} />
            <Route path="/reception/tokens" element={<Page path="/reception/tokens" roles={['receptionist', 'admin']}><TokenSystem /></Page>} />

            {/* Shared modules */}
            <Route path="/lab" element={<Page path="/lab" roles={['lab', 'receptionist']}><LabDashboard /></Page>} />
            <Route path="/beds" element={<Page path="/beds" roles={['doctor', 'receptionist', 'admin']}><BedManagement /></Page>} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
