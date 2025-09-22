import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  CalendarIcon, 
  UserPlusIcon, 
  CurrencyDollarIcon, 
  CogIcon, 
  ChartBarIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const getMenuItems = () => {
    // Special menu for housekeeping users - only show Housekeeping and redirect to it
    if (user && (user.userTypeRole === 'HOUSEKEEPING' || user.userTypeId === 'HOUSEKEEPING')) {
      return [
        {
          name: 'Housekeeping',
          href: '/housekeeping',
          icon: BuildingOfficeIcon,
          roles: ['HOUSEKEEPING'],
        },
      ];
    }
    
    // Default menu for all other users
    return [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: HomeIcon,
        roles: ['ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST'],
      },
      {
        name: 'Reservations',
        href: '/reservations',
        icon: CalendarIcon,
        roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST'],
      },
      {
        name: 'Check-In',
        href: '/check-in',
        icon: UserPlusIcon,
        roles: ['ADMIN', 'MANAGER', 'RECEPTIONIST'],
      },
      {
        name: 'Cashier',
        href: '/cashier',
        icon: CurrencyDollarIcon,
        roles: ['ADMIN', 'MANAGER', 'CASHIER'],
      },
      {
        name: 'Transactions',
        href: '/transaction',
        icon: CurrencyDollarIcon,
        roles: ['ADMIN', 'MANAGER', 'CASHIER'],
      },
      {
        name: 'Generate Bill',
        href: '/generate-bill',
        icon: DocumentTextIcon,
        roles: ['ADMIN', 'MANAGER', 'CASHIER'],
      },
      {
        name: 'Admin',
        href: '/admin',
        icon: CogIcon,
        roles: ['ADMIN'],
      },
      {
        name: 'Reports',
        href: '/reports',
        icon: ChartBarIcon,
        roles: ['ADMIN', 'MANAGER', 'CASHIER'],
      },
      {
        name: 'Housekeeping',
        href: '/housekeeping',
        icon: BuildingOfficeIcon,
        roles: ['ADMIN', 'MANAGER', 'HOUSEKEEPING'],
      },
    ];
  };
  
  const menuItems = getMenuItems();

  const hasAccess = (roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.userTypeRole) || roles.includes(user.userTypeId);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="w-64 bg-white shadow-xl h-full flex flex-col border-r border-gray-100">
      {/* Logo Section */}
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <BuildingOfficeIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">HotelManager</h2>
            <p className="text-xs text-blue-600 font-medium">Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 pb-4 overflow-y-auto scrollbar-hide">
        <div className="space-y-1">
          {menuItems.map((item) => {
            if (!hasAccess(item.roles)) return null;
            
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`mr-3 flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-lg ${
                  isActive ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-blue-100'
                }`}>
                  <item.icon
                    className={`h-4 w-4 ${
                      isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'
                    }`}
                  />
                </div>
                <span className="font-medium">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-xl">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">
              {user?.userName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.userName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.userTypeName}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;