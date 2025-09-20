import React, { useState, useEffect } from 'react';
import { 
  HomeIcon, 
  UserGroupIcon, 
  KeyIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  UserPlusIcon,
  CurrencyRupeeIcon,
  ClipboardDocumentListIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Room, RoomStats, RoomType } from '../types/api';
import { roomApi, reservationApi, checkInApi, masterDataApi, operationsApi, billApi } from '../services/api';
import Layout from '../components/Layout/Layout';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomStats, setRoomStats] = useState<RoomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const roomsPerPage = 12;

  // View Details modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsRoom, setDetailsRoom] = useState<Room | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Check-in form state
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [reservationInfo, setReservationInfo] = useState<any>(null);
  const [autoFillLoading, setAutoFillLoading] = useState(false);

  // New state variables for filters
  const [floors, setFloors] = useState<string[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('');

  // Operations state
  const [auditDate, setAuditDate] = useState<string>('');
  const [shiftDate, setShiftDate] = useState<string>('');
  const [runningShift, setRunningShift] = useState<string>('');

  const [checkInFormData, setCheckInFormData] = useState({
    reservationNo: '',
    guestName: '',
    arrivalDate: '',
    departureDate: '',
    noOfDays: 1,
    noOfPersons: 1,
    noOfRooms: 1,
    mobileNumber: '',
    rate: 0,
    remarks: '',
    includingGst: true,
  });

  const handleViewDetails = async (roomId: string) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const res = await roomApi.getRoomById(roomId);
      if (res.data.success) {
        setDetailsRoom(res.data.data);
      } else {
        setDetailsError(res.data.message || 'Failed to fetch details');
      }
    } catch (err) {
      setDetailsError('Failed to fetch details');
    }
    setDetailsLoading(false);
  };

  const handleRoomClick = async (room: Room) => {
    // Allow clicking on any room (vacant or occupied) to show the check-in form
    setSelectedRoom(room);
    setShowCheckInForm(true);
    // Reset form data when selecting a new room
    setCheckInFormData({
      reservationNo: '',
      guestName: '',
      arrivalDate: '',
      departureDate: '',
      noOfDays: 1,
      noOfPersons: 1,
      noOfRooms: 1,
      mobileNumber: '',
      rate: 0,
      remarks: '',
      includingGst: true,
    });
    setReservationInfo(null);
    
    // If the room is occupied, try to auto-fill with existing reservation data
    if (room.status === 'OD' || room.status === 'OI') {
      try {
        // Get all in-house guests to find the one for this room
        const response = await checkInApi.getInHouseGuests();
        if (response.data.success) {
          const inHouseGuests = response.data.data;
          // Find the guest for this specific room
          const guest = inHouseGuests.find(g => g.roomId === room.roomId);
          
          if (guest && guest.reservationNo) {
            // If we have a reservation number, try to get the full reservation details
            try {
              const reservationResponse = await reservationApi.searchReservations(guest.reservationNo);
              if (reservationResponse.data.success && reservationResponse.data.data.length > 0) {
                // Find the exact match for the reservation number
                const reservation = reservationResponse.data.data.find((r: any) => 
                  r.reservationNo === guest.reservationNo
                );
                
                if (reservation) {
                  // Calculate number of days
                  const arrivalDate = new Date(reservation.arrivalDate);
                  const departureDate = new Date(reservation.departureDate);
                  const timeDiff = departureDate.getTime() - arrivalDate.getTime();
                  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                  
                  setReservationInfo(reservation);
                  setCheckInFormData(prev => ({
                    ...prev,
                    reservationNo: reservation.reservationNo || '',
                    guestName: reservation.guestName || guest.guestName || '',
                    arrivalDate: reservation.arrivalDate || '',
                    departureDate: reservation.departureDate || '',
                    noOfDays: daysDiff > 0 ? daysDiff : 1,
                    noOfPersons: reservation.noOfPersons || 1,
                    noOfRooms: reservation.noOfRooms || 1,
                    mobileNumber: reservation.mobileNumber || guest.mobileNumber || '',
                    rate: reservation.rate || guest.rate || 0,
                    includingGst: reservation.includingGst === 'Y',
                  }));
                  return;
                }
              }
            } catch (reservationError) {
              console.error('Failed to fetch reservation data:', reservationError);
            }
          }
          
          // If we couldn't get reservation data, fall back to guest data
          if (guest) {
            // Calculate number of days
            const arrivalDate = new Date(guest.arrivalDate);
            const departureDate = new Date(guest.departureDate);
            const timeDiff = departureDate.getTime() - arrivalDate.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            // Auto-fill the form with guest data
            setCheckInFormData(prev => ({
              ...prev,
              reservationNo: guest.reservationNo || '',
              guestName: guest.guestName || '',
              arrivalDate: guest.arrivalDate || '',
              departureDate: guest.departureDate || '',
              noOfDays: daysDiff > 0 ? daysDiff : 1,
              noOfPersons: 1,
              noOfRooms: 1,
              mobileNumber: guest.mobileNumber || '',
              rate: guest.rate || 0,
              includingGst: true,
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch in-house guest data:', error);
      }
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchRoomStats();
    fetchRoomTypes();
    fetchFloors();
    // In a real implementation, these would come from API calls
    setAuditDate(new Date().toLocaleDateString());
    setShiftDate(new Date().toLocaleDateString());
    setRunningShift('Shift 1');
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await roomApi.getRooms();
      if (response.data.success) {
        setRooms(response.data.data);
        // Update floors when rooms are fetched
        const uniqueFloors = Array.from(new Set(response.data.data.map((room: Room) => room.floor)));
        setFloors(uniqueFloors);
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

  const fetchRoomTypes = async () => {
    try {
      const response = await masterDataApi.getRoomTypes();
      if (response.data.success) {
        setRoomTypes(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch room types:', error);
    }
  };

  const fetchFloors = () => {
    // Extract unique floors from rooms
    const uniqueFloors = Array.from(new Set(rooms.map(room => room.floor)));
    setFloors(uniqueFloors);
  };

  // Function to auto-fill guest information based on reservation number
  const autoFillGuestInfo = async (reservationNo: string) => {
    if (!reservationNo) {
      setReservationInfo(null);
      return;
    }
    
    setAutoFillLoading(true);
    try {
      const response = await reservationApi.searchReservations(reservationNo.trim());
      if (response.data.success && response.data.data.length > 0) {
        // Find the exact match for the reservation number
        const reservation = response.data.data.find((r: any) => 
          r.reservationNo.toLowerCase() === reservationNo.trim().toLowerCase()
        );
        
        if (reservation) {
          // Calculate number of days
          const arrivalDate = new Date(reservation.arrivalDate);
          const departureDate = new Date(reservation.departureDate);
          const timeDiff = departureDate.getTime() - arrivalDate.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          setReservationInfo(reservation);
          setCheckInFormData(prev => ({
            ...prev,
            guestName: reservation.guestName,
            arrivalDate: reservation.arrivalDate || '',
            departureDate: reservation.departureDate || '',
            noOfDays: daysDiff > 0 ? daysDiff : 1,
            noOfPersons: reservation.noOfPersons || 1,
            noOfRooms: reservation.noOfRooms || 1,
            mobileNumber: reservation.mobileNumber || '',
            rate: reservation.rate || 0,
            includingGst: reservation.includingGst === 'Y',
          }));
        } else {
          setReservationInfo(null);
        }
      } else {
        setReservationInfo(null);
      }
    } catch (error) {
      console.error('Failed to auto-fill guest info:', error);
      setReservationInfo(null);
    } finally {
      setAutoFillLoading(false);
    }
  };

  const handleCheckInInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setCheckInFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    
    // Auto-fill guest info when reservation number changes
    if (name === 'reservationNo') {
      autoFillGuestInfo(value);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VR': return 'bg-green-100 text-green-800 border border-green-200';
      case 'OD': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'OI': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Blocked': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
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

  // Add filter functions
  const handleFloorFilter = (floor: string) => {
    setSelectedFloor(floor);
    setSelectedRoomType(''); // Clear room type filter when floor is selected
  };

  const handleRoomTypeFilter = (roomTypeId: string) => {
    setSelectedRoomType(roomTypeId);
    setSelectedFloor(''); // Clear floor filter when room type is selected
  };

  const handleRefresh = () => {
    setSelectedFloor('');
    setSelectedRoomType('');
  };

  const handleViewBill = async (roomId: string) => {
    try {
      // First get room details to get folio number
      const roomResponse = await roomApi.getRoomById(roomId);
      if (roomResponse.data.success && roomResponse.data.data.folioNo) {
        const folioNo = roomResponse.data.data.folioNo;
        // Navigate to bill page with folio number
        navigate(`/bill/${folioNo}`);
      } else {
        setDetailsError('No bill found for this room');
      }
    } catch (error) {
      console.error('Failed to fetch bill:', error);
      setDetailsError('Failed to fetch bill details');
    }
  };

  const handleRoomShift = async (roomId: string) => {
    // For now, we'll just show an alert - in a real implementation, 
    // this would open a modal or navigate to a room shift page
    alert('Room shift functionality would be implemented here');
  };

  const filteredRooms = rooms.filter(room =>
    room.roomNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (room.guestName && room.guestName.toLowerCase().includes(searchTerm.toLowerCase()))
  ).filter(room => {
    // Apply floor filter
    if (selectedFloor && room.floor !== selectedFloor) {
      return false;
    }
    // Apply room type filter
    if (selectedRoomType && room.roomTypeId !== selectedRoomType) {
      return false;
    }
    return true;
  });

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

        {/* Dashboard Overview Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Audit Date:</span>
                <span className="font-medium">{auditDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shift Date:</span>
                <span className="font-medium">{shiftDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Running Shift:</span>
                <span className="font-medium">{runningShift}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Floor Filters</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRefresh}
                className={`px-3 py-1 text-sm rounded ${!selectedFloor ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                All Floors
              </button>
              {floors.map((floor) => (
                <button
                  key={floor}
                  onClick={() => handleFloorFilter(floor)}
                  className={`px-3 py-1 text-sm rounded ${selectedFloor === floor ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {floor}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Type Filters</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleRefresh}
                className={`px-3 py-1 text-sm rounded ${!selectedRoomType ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                All Types
              </button>
              {roomTypes.map((roomType) => (
                <button
                  key={roomType.typeId}
                  onClick={() => handleRoomTypeFilter(roomType.typeId)}
                  className={`px-3 py-1 text-sm rounded ${selectedRoomType === roomType.typeId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {roomType.typeName}
                </button>
              ))}
            </div>
          </div>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {currentRooms.map((room) => (
            <div 
              key={room.roomId} 
              className={`bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 flex flex-col ${
                room.status === 'VR' ? 'hover:border-green-400 border-green-200' : 
                room.status === 'OD' || room.status === 'OI' ? 'hover:border-blue-400 border-blue-200' : 'hover:border-red-400 border-red-200'
              }`}
              onClick={() => handleRoomClick(room)}
            >
              <div className="p-4 flex flex-col items-center justify-center flex-grow">
                <div className="text-2xl font-bold text-gray-800 mb-2">{room.roomNo}</div>
                <div className="text-sm text-gray-600 mb-2">Floor: {room.floor}</div>
                {room.roomTypeName && (
                  <div className="text-sm text-gray-600 mb-2">Type: {room.roomTypeName}</div>
                )}
                <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
                  room.status === 'VR' ? 'bg-green-100 text-green-800 border border-green-200' :
                  room.status === 'OD' || room.status === 'OI' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                  'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {getStatusIcon(room.status)}
                  <span>{getStatusText(room.status)}</span>
                </span>
              </div>
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(room.roomId);
                  }}
                  className="text-xs text-gray-600 hover:text-blue-600 flex items-center"
                >
                  <EyeIcon className="w-3 h-3 mr-1" />
                  Details
                </button>
                {room.status === 'OD' || room.status === 'OI' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewBill(room.roomId);
                    }}
                    className="text-xs text-gray-600 hover:text-green-600 flex items-center"
                  >
                    <CurrencyRupeeIcon className="w-3 h-3 mr-1" />
                    Bill
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRoomShift(room.roomId);
                    }}
                    className="text-xs text-gray-600 hover:text-purple-600 flex items-center"
                  >
                    <ArrowsRightLeftIcon className="w-3 h-3 mr-1" />
                    Shift
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Check-in Form for Selected Room */}
        {showCheckInForm && selectedRoom && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Check-In Form for Room {selectedRoom.roomNo}</h2>
              <button
                onClick={() => setShowCheckInForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Guest Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reservation Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="reservationNo"
                        value={checkInFormData.reservationNo}
                        onChange={handleCheckInInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter reservation number"
                      />
                      {autoFillLoading && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    {/* Reservation Info Display */}
                    {reservationInfo && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-blue-800">{reservationInfo.guestName}</p>
                            <p className="text-xs text-blue-600">
                              Rooms: {reservationInfo.noOfRooms} | 
                              Checked In: {reservationInfo.roomsCheckedIn || 0} | 
                              Remaining: {reservationInfo.noOfRooms - (reservationInfo.roomsCheckedIn || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
                    <input
                      type="text"
                      name="guestName"
                      value={checkInFormData.guestName}
                      onChange={handleCheckInInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter guest name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Date</label>
                      <input
                        type="date"
                        name="arrivalDate"
                        value={checkInFormData.arrivalDate}
                        onChange={handleCheckInInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Departure Date</label>
                      <input
                        type="date"
                        name="departureDate"
                        value={checkInFormData.departureDate}
                        onChange={handleCheckInInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">No of Days</label>
                      <input
                        type="number"
                        name="noOfDays"
                        min="1"
                        value={checkInFormData.noOfDays}
                        onChange={handleCheckInInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">No of Persons</label>
                      <input
                        type="number"
                        name="noOfPersons"
                        min="1"
                        value={checkInFormData.noOfPersons}
                        onChange={handleCheckInInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">No of Rooms</label>
                      <input
                        type="number"
                        name="noOfRooms"
                        min="1"
                        value={checkInFormData.noOfRooms}
                        onChange={handleCheckInInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      name="mobileNumber"
                      value={checkInFormData.mobileNumber}
                      onChange={handleCheckInInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter mobile number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate</label>
                    <input
                      type="number"
                      name="rate"
                      min="0"
                      value={checkInFormData.rate}
                      onChange={handleCheckInInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter rate"
                    />
                  </div>
                  
                  {/* Including GST Toggle */}
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        name="includingGst"
                        checked={checkInFormData.includingGst}
                        onChange={handleCheckInInputChange}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Including GST</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <textarea
                      name="remarks"
                      value={checkInFormData.remarks}
                      onChange={handleCheckInInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Any special requests or notes"
                    ></textarea>
                  </div>
                  
                  <div className="pt-4">
                    <button
                      disabled={checkInLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 mb-3"
                    >
                      {checkInLoading ? 'Processing...' : 'Check-In Guest'}
                    </button>
                    <button
                      onClick={() => navigate('/check-in')}
                      className="w-full bg-gradient-to-r from-gray-600 to-gray-800 text-white font-semibold py-3 px-4 rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all"
                    >
                      Go to Full Check-In Page
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
      
      {/* Details Modal */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => { setDetailsOpen(false); setDetailsRoom(null); }}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-xl font-bold mb-4">Room Details</h2>
            {detailsLoading ? (
              <div className="flex items-center justify-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : detailsError ? (
              <div className="text-red-500">{detailsError}</div>
            ) : detailsRoom ? (
              <div className="space-y-4">
                <div className="flex items-center">
                  <span className="w-32 font-semibold text-gray-700">Room No:</span>
                  <span className="text-gray-900">{detailsRoom.roomNo}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 font-semibold text-gray-700">Floor:</span>
                  <span className="text-gray-900">{detailsRoom.floor}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 font-semibold text-gray-700">Status:</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(detailsRoom.status)}`}>
                    {getStatusIcon(detailsRoom.status)}
                    <span className="ml-1">{getStatusText(detailsRoom.status)}</span>
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 font-semibold text-gray-700">Room Type:</span>
                  <span className="text-gray-900">{detailsRoom.roomTypeName || '-'}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 font-semibold text-gray-700">Guest Name:</span>
                  <span className="text-gray-900">{detailsRoom.guestName || '-'}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 font-semibold text-gray-700">Folio No:</span>
                  <span className="text-gray-900">{detailsRoom.folioNo || '-'}</span>
                </div>
              </div>
            ) : (
              <div>No details found.</div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;