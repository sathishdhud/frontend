import React, { useState, useEffect } from 'react';
import { 
  HomeIcon, 
  UserGroupIcon, 
  KeyIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { Room, RoomStats } from '../types/api';
import { roomApi } from '../services/api';
import Layout from '../components/Layout/Layout';

const Dashboard: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomStats, setRoomStats] = useState<RoomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const roomsPerPage = 12;

  useEffect(() => {
    fetchRooms();
    fetchRoomStats();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await roomApi.getRooms();
      if (response.data.success) {
        setRooms(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const fetchRoomStats = async () => {
    try {
      const response = await roomApi.getRoomStats();
      if (response.data.success) {
        setRoomStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch room stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VR': return 'bg-green-100 text-green-800 border-green-200';
      case 'OD': return 'bg-red-100 text-red-800 border-red-200';
      case 'OI': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Blocked': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'VR': return 'Vacant';
      case 'OD': return 'Occupied';
      case 'OI': return 'Occupied';
      case 'Blocked': return 'Blocked';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VR': return <KeyIcon className="w-4 h-4" />;
      case 'OD': return <UserGroupIcon className="w-4 h-4" />;
      case 'OI': return <UserGroupIcon className="w-4 h-4" />;
      case 'Blocked': return <ExclamationTriangleIcon className="w-4 h-4" />;
      default: return <HomeIcon className="w-4 h-4" />;
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.roomNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (room.guestName && room.guestName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);
  const startIndex = (currentPage - 1) * roomsPerPage;
  const currentRooms = filteredRooms.slice(startIndex, startIndex + roomsPerPage);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <button
            onClick={() => {
              fetchRooms();
              fetchRoomStats();
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rooms</p>
                <p className="text-3xl font-bold text-gray-900">{roomStats?.totalRooms || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <HomeIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Occupied</p>
                <p className="text-3xl font-bold text-red-600">{roomStats?.occupiedRooms || 0}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <UserGroupIcon className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vacant</p>
                <p className="text-3xl font-bold text-green-600">{roomStats?.availableRooms || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <KeyIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Blocked</p>
                <p className="text-3xl font-bold text-gray-600">{roomStats?.blockedRooms || 0}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <ExclamationTriangleIcon className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search rooms by number or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {currentRooms.map((room) => (
            <div key={room.roomId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{room.roomNo}</h3>
                  <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(room.status)}`}>
                    {getStatusIcon(room.status)}
                    <span>{getStatusText(room.status)}</span>
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  {room.guestName ? (
                    <>
                      <p><span className="font-medium">Guest:</span> {room.guestName}</p>
                      {room.folioNo && <p><span className="font-medium">Folio:</span> {room.folioNo}</p>}
                    </>
                  ) : (
                    <p className="text-gray-400 italic">No guest checked in.</p>
                  )}
                </div>

                <div className="mt-4 flex space-x-2">
                  <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    <EyeIcon className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                  
                  {room.status === 'VR' && (
                    <button className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">
                      <UserPlusIcon className="w-4 h-4" />
                      <span>Check-In Guest</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Previous
            </button>
            
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 text-sm rounded ${
                  currentPage === i + 1
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {i + 1}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        <div className="text-center text-sm text-gray-500">
          Room statuses are updated in real-time. Click the refresh icon for the latest data.
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;