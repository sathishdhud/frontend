import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  CalendarIcon, 
  UserPlusIcon, 
  CurrencyDollarIcon, 
  CogIcon, 
  ChartBarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      roles: ['ADMIN', 'MANAGER', 'CASHIER', 'RECEPTIONIST', 'HOUSEKEEPING'],
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

  const hasAccess = (roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.userTypeRole) || roles.includes(user.userTypeId);
  };

  return (
    <div className="w-64 bg-white shadow-lg h-full">
      <div className="flex flex-col h-full">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">HMS</h2>
              <p className="text-sm text-gray-500">Hotel Management</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 pb-4 space-y-1">
          {menuItems.map((item) => {
            if (!hasAccess(item.roles)) return null;
            
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon
                  className={`mr-3 flex-shrink-0 h-5 w-5 ${
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user?.userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{user?.userName}</p>
              <p className="text-xs text-gray-500">{user?.userTypeName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;