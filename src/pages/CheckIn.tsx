import React, { useState, useEffect, useRef } from 'react';
import { ArrowsRightLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckIn as CheckInType, Room, Advance } from '../types/api';
import { checkInApi, roomApi, advanceApi, reservationApi } from '../services/api';
import Layout from '../components/Layout/Layout';

const CheckIn: React.FC = () => {
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  // Add state for auto-fill loading
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  // Add state for reservation info
  const [reservationInfo, setReservationInfo] = useState<any>(null);
  // Add notification states
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Add a ref for debouncing
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    reservationNo: '',
    guestName: '',
    arrivalDate: '',
    departureDate: '',
    noOfDays: 1,
    noOfPersons: 1,
    mobileNumber: '',
    rate: 0,
    roomId: '',
    remarks: '',
    includingGst: true,
  });

  // Function to show notifications
  const showNotification = (message: string, isSuccess: boolean = true) => {
    if (isSuccess) {
      setSuccessMessage(message);
      setErrorMessage('');
    } else {
      setErrorMessage(message);
      setSuccessMessage('');
    }
    
    // Clear notifications after 5 seconds
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 5000);
  };

  useEffect(() => {
    fetchAvailableRooms();
    if (formData.reservationNo) {
      fetchAdvances();
    }
  }, [formData.reservationNo]);

  // Cleanup effect to clear any pending timeouts
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Validate reservation on load if there's a reservation number
  useEffect(() => {
    if (formData.reservationNo && !isWalkIn) {
      fetchReservationInfo(formData.reservationNo);
    }
  }, []);

  // Clear reservation info when switching to walk-in mode
  useEffect(() => {
    if (isWalkIn) {
      setReservationInfo(null);
    } else if (formData.reservationNo) {
      fetchReservationInfo(formData.reservationNo);
    }
  }, [isWalkIn]);

  const fetchAvailableRooms = async () => {
    try {
      const response = await roomApi.getAvailableRooms();
      if (response.data.success) {
        setAvailableRooms(response.data.data);
      }
    } catch (error) {
      showNotification('Failed to fetch available rooms. Please try again.', false);
    }
  };

  const fetchAdvances = async () => {
    try {
      const response = await advanceApi.getAdvancesByReservation(formData.reservationNo);
      if (response.data.success) {
        setAdvances(response.data.data);
      }
    } catch (error) {
      showNotification('Failed to fetch advances. Please try again.', false);
    }
  };

  // Function to fetch and display reservation information
  const fetchReservationInfo = async (reservationNo: string) => {
    if (!reservationNo) {
      setReservationInfo(null);
      return;
    }
    
    try {
      const response = await reservationApi.searchReservations(reservationNo);
      if (response.data.success && response.data.data.length > 0) {
        const reservation = response.data.data.find((r: any) => 
          r.reservationNo === reservationNo
        );
        
        if (reservation) {
          setReservationInfo(reservation);
        } else {
          setReservationInfo(null);
        }
      } else {
        setReservationInfo(null);
      }
    } catch (error) {
      showNotification('Failed to fetch reservation info. Please try again.', false);
      setReservationInfo(null);
    }
  };

  // Function to auto-fill guest name based on reservation number
  const autoFillGuestName = async (reservationNo: string) => {
    if (!reservationNo) {
      setFormData(prev => ({ ...prev, guestName: '' }));
      setReservationInfo(null);
      return;
    }
    
    // Fetch reservation info
    await fetchReservationInfo(reservationNo);
    
    setAutoFillLoading(true);
    try {
      // Search for reservations by reservation number
      const response = await reservationApi.searchReservations(reservationNo.trim());
      if (response.data.success && response.data.data.length > 0) {
        // Find the exact match for the reservation number (case-insensitive)
        const reservation = response.data.data.find((r: any) => 
          r.reservationNo.toLowerCase() === reservationNo.trim().toLowerCase()
        );
        if (reservation) {
          // Calculate number of days
          const arrivalDate = new Date(reservation.arrivalDate);
          const departureDate = new Date(reservation.departureDate);
          const timeDiff = departureDate.getTime() - arrivalDate.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          setFormData(prev => ({
            ...prev,
            guestName: reservation.guestName,
            arrivalDate: reservation.arrivalDate || '',
            departureDate: reservation.departureDate || '',
            noOfDays: daysDiff > 0 ? daysDiff : 1,
            noOfPersons: reservation.noOfPersons || 1,
            mobileNumber: reservation.mobileNumber || '',
            rate: reservation.rate || 0,
            includingGst: reservation.includingGst === 'Y'
          }));
        } else {
          setFormData(prev => ({ ...prev, guestName: '' }));
        }
      } else {
        setFormData(prev => ({ ...prev, guestName: '' }));
      }
    } catch (error) {
      showNotification('Failed to auto-fill guest name. Please try again.', false);
      setFormData(prev => ({ ...prev, guestName: '' }));
    } finally {
      setAutoFillLoading(false);
    }
  };

  // Function to check if a reservation can accept more check-ins
  const canCheckInToReservation = async (reservationNo: string): Promise<{ canCheckIn: boolean; message?: string }> => {
    try {
      const response = await reservationApi.searchReservations(reservationNo);
      if (response.data.success && response.data.data.length > 0) {
        const reservation = response.data.data.find((r: any) => 
          r.reservationNo === reservationNo
        );
        
        if (reservation) {
          const roomsCheckedIn = reservation.roomsCheckedIn || 0;
          const noOfRooms = reservation.noOfRooms || 0;
          
          if (roomsCheckedIn >= noOfRooms) {
            return { 
              canCheckIn: false, 
              message: `All ${noOfRooms} rooms for this reservation have already been checked in. No more check-ins allowed.` 
            };
          }
          
          return { canCheckIn: true };
        }
      }
      
      return { 
        canCheckIn: false, 
        message: 'Reservation not found.' 
      };
    } catch (error) {
      showNotification('Failed to validate reservation. Please try again.', false);
      return { 
        canCheckIn: false, 
        message: 'Failed to validate reservation. Please try again.' 
      };
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : 
               type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    
    // Auto-fill guest name and fetch reservation info when reservation number changes with debouncing
    if (name === 'reservationNo' && !isWalkIn) {
      // Clear previous timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      // Set new timeout
      debounceRef.current = setTimeout(() => {
        autoFillGuestName(value);
        // Check if rooms are already assigned
        checkRoomsAssigned(value);
      }, 300); // 300ms debounce
    }
  };

  // Function to check if rooms are already assigned for a reservation
  const checkRoomsAssigned = async (reservationNo: string) => {
    if (!reservationNo) return;
    
    try {
      const response = await reservationApi.searchReservations(reservationNo);
      if (response.data.success && response.data.data.length > 0) {
        const reservation = response.data.data.find((r: any) => 
          r.reservationNo === reservationNo
        );
        
        if (reservation) {
          const roomsCheckedIn = reservation.roomsCheckedIn || 0;
          const noOfRooms = reservation.noOfRooms || 0;
          
          if (roomsCheckedIn >= noOfRooms) {
            showNotification(`All ${noOfRooms} rooms for this reservation have already been assigned.`, false);
          }
        }
      }
    } catch (error) {
      showNotification('Failed to check room assignment. Please try again.', false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.guestName.trim()) {
        showNotification('Please enter a guest name or select a valid reservation number', false);
        setLoading(false);
        return;
      }
      
      if (!formData.roomId) {
        showNotification('Please select a room', false);
        setLoading(false);
        return;
      }

      // For reservation-based check-ins, validate roomsCheckedIn count
      if (!isWalkIn && formData.reservationNo) {
        const validation = await canCheckInToReservation(formData.reservationNo);
        if (!validation.canCheckIn) {
          showNotification(validation.message || 'Cannot check in to this reservation.', false);
          setLoading(false);
          return;
        }
      }

      const checkInData = {
        reservationNo: isWalkIn ? undefined : formData.reservationNo,
        guestName: formData.guestName,
        roomId: formData.roomId,
        arrivalDate: formData.arrivalDate,
        departureDate: formData.departureDate,
        mobileNumber: formData.mobileNumber,
        rate: formData.rate,
        walkIn: isWalkIn ? 'Y' as const : 'N' as const,
        remarks: formData.remarks,
      };

      const response = await checkInApi.processCheckIn(checkInData);
      
      if (response.data.success) {
        // If this was a reservation-based check-in, update the roomsCheckedIn count
        if (!isWalkIn && formData.reservationNo) {
          try {
            // Get the current reservation to update roomsCheckedIn
            const reservationResponse = await reservationApi.searchReservations(formData.reservationNo);
            if (reservationResponse.data.success && reservationResponse.data.data.length > 0) {
              const reservation = reservationResponse.data.data.find((r: any) => 
                r.reservationNo === formData.reservationNo
              );
              
              if (reservation) {
                const currentRoomsCheckedIn = reservation.roomsCheckedIn || 0;
                // Update the reservation with incremented roomsCheckedIn count
                await reservationApi.updateRoomsCheckedIn(
                  formData.reservationNo, 
                  currentRoomsCheckedIn + 1
                );
              }
            }
          } catch (error) {
            showNotification('Failed to update reservation count, but check-in was successful.', false);
            // Don't fail the check-in if we can't update the reservation count
          }
        }
        
        showNotification('Check-in processed successfully!');
        // Reset form
        setFormData({
          reservationNo: '',
          guestName: '',
          arrivalDate: '',
          departureDate: '',
          noOfDays: 1,
          noOfPersons: 1,
          mobileNumber: '',
          rate: 0,
          roomId: '',
          remarks: '',
          includingGst: true,
        });
        setAdvances([]); // Clear advances as well
      }
    } catch (error: any) {
      showNotification(`Error: ${error.response?.data?.message || 'Failed to process check-in'}`, false);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({
      reservationNo: '',
      guestName: '',
      arrivalDate: '',
      departureDate: '',
      noOfDays: 1,
      noOfPersons: 1,
      mobileNumber: '',
      rate: 0,
      roomId: '',
      remarks: '',
      includingGst: true,
    });
    setAdvances([]);
    setReservationInfo(null);
    // Clear any pending debounced calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // Reset auto-fill loading state
    setAutoFillLoading(false);
    // Clear notifications
    setSuccessMessage('');
    setErrorMessage('');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Check-In Guest</h1>
          <div className="text-sm text-gray-500">
            Process guest arrivals and update room statuses.
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Check-in Form */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Check-In Guest</h2>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <span className="text-sm font-medium text-gray-700">Walk-In Guest</span>
                    <div
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isWalkIn ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      onClick={() => setIsWalkIn(!isWalkIn)}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isWalkIn ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Reservation Number */}
                {!isWalkIn && (
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reservation Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="reservationNo"
                        value={formData.reservationNo}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          <div>
                            {reservationInfo.roomsCheckedIn >= reservationInfo.noOfRooms ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Full
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Available
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Guest Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guest Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="guestName"
                      required
                      value={formData.guestName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {autoFillLoading && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Arrival Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arrival Date
                  </label>
                  <input
                    type="date"
                    name="arrivalDate"
                    required
                    value={formData.arrivalDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Departure Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departure Date
                  </label>
                  <input
                    type="date"
                    name="departureDate"
                    required
                    value={formData.departureDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* No of Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    No of Days
                  </label>
                  <input
                    type="number"
                    name="noOfDays"
                    min="1"
                    value={formData.noOfDays}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* No of Persons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    No of Persons
                  </label>
                  <input
                    type="number"
                    name="noOfPersons"
                    min="1"
                    value={formData.noOfPersons}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate
                  </label>
                  <input
                    type="number"
                    name="rate"
                    min="0"
                    value={formData.rate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Including GST Toggle */}
              <div className="mb-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="includingGst"
                    checked={formData.includingGst}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Including GST</span>
                </label>
              </div>

              {/* Remarks */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any special requests or notes"
                />
              </div>

              {/* Room Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Number <span className="text-red-500">*</span>
                </label>
                <select
                  name="roomId"
                  required
                  value={formData.roomId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a vacant room</option>
                  {availableRooms.map(room => (
                    <option key={room.roomId} value={room.roomId}>
                      Room {room.roomNo} - {room.roomTypeName || 'Standard'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Note: For walk-in guests, room status will automatically update to "OD (Occupied Dirty)" upon check-in.
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Check-In'}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>

          {/* Advance Details Sidebar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Advance Details</h3>
              <p className="text-sm text-gray-600 mt-1">
                Payments recorded for this reservation or folio.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {advances.length > 0 ? (
                advances.map((advance, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-lg font-semibold text-green-600">
                        $ {advance.amount.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">{advance.date}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>{advance.modeOfPaymentName || advance.modeOfPaymentId}</span>
                    </div>
                    <p className="text-xs text-gray-500">{advance.narration || advance.remarks}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No advance payments found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckIn;