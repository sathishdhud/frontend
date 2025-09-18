import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles }) => {
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

  // Special handling for housekeeping users - they should not have access to dashboard
  const isHousekeepingUser = user.userTypeRole === 'HOUSEKEEPING' || user.userTypeId === 'HOUSEKEEPING';
  
  // If this is the dashboard route and the user is a housekeeping user, redirect them to housekeeping
  if (window.location.pathname === '/dashboard' && isHousekeepingUser) {
    return <Navigate to="/housekeeping" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasAccess = requiredRoles.some(role => 
      role === user.userTypeRole || role === user.userTypeId
    );
    
    if (!hasAccess) {
      // Special case: if a housekeeping user tries to access a restricted page, redirect to housekeeping
      if (isHousekeepingUser) {
        return <Navigate to="/housekeeping" replace />;
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;