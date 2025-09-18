import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import CheckIn from './pages/CheckIn';
import Cashier from './pages/Cashier';
import TransactionForm from './pages/TransactionForm';
import Admin from './pages/Admin';
import Reports from './pages/Reports';
import GenerateBill from './pages/GenerateBill';
import BillGenerateByReservation from './pages/BillGenerateByReservation';
import Housekeeping from './pages/Housekeeping';
import PaymentPage from './pages/PaymentPage';
import PayBillForm from './pages/PayBillForm';

const HomeRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect housekeeping users to housekeeping section
  if (user.userTypeRole === 'HOUSEKEEPING' || user.userTypeId === 'HOUSEKEEPING') {
    return <Navigate to="/housekeeping" replace />;
  }

  // Redirect all other users to dashboard
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/reservations" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST']}>
                <Reservations />
              </ProtectedRoute>
            } />
            
            <Route path="/check-in" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'RECEPTIONIST']}>
                <CheckIn />
              </ProtectedRoute>
            } />
            
            <Route path="/cashier" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
                <Cashier />
              </ProtectedRoute>
            } />
            <Route path="/transaction" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
                <TransactionForm />
              </ProtectedRoute>
            } />
            
            <Route path="/generate-bill" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
                <GenerateBill />
              </ProtectedRoute>
            } />
            
            <Route path="/generate-bill-reservation" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
                <BillGenerateByReservation />
              </ProtectedRoute>
            } />
            
            {/* Payment Routes */}
            <Route path="/payment/:billNo" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
                <PaymentPage />
              </ProtectedRoute>
            } />
            
            <Route path="/payment" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
                <PayBillForm />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute requiredRoles={['ADMIN']}>
                <Admin />
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
                <Reports />
              </ProtectedRoute>
            } />
            
            <Route path="/housekeeping" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'HOUSEKEEPING']}>
                <Housekeeping />
              </ProtectedRoute>
            } />

            {/* Redirect root to dashboard or housekeeping based on user role */}
            <Route path="/" element={<HomeRedirect />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;