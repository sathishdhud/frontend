import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import CheckIn from './pages/CheckIn';
import Cashier from './pages/Cashier';
import TransactionForm from './pages/TransactionForm';


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
              <ProtectedRoute>
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
            
            {/* Placeholder routes for future pages */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRoles={['ADMIN']}>
                <div className="p-6">Admin panel coming soon...</div>
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
                <div className="p-6">Reports coming soon...</div>
              </ProtectedRoute>
            } />
            
            <Route path="/housekeeping" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'HOUSEKEEPING']}>
                <div className="p-6">Housekeeping module coming soon...</div>
              </ProtectedRoute>
            } />

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;