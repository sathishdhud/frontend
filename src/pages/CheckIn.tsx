import React, { useState, useEffect } from 'react';
import { SwitchIcon } from '@heroicons/react/24/outline';
import { CheckIn as CheckInType, Room, Advance } from '../types/api';
import { checkInApi, roomApi, advanceApi } from '../services/api';
import Layout from '../components/Layout/Layout';

const CheckIn: React.FC = () => {
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);

  const [formData, setFormData] = useState({
    reservationNo: 'RES78901',
    folioNo: 'F253904',
    guestName: 'Alice Wonderland',
    arrivalDate: '2024-07-25',
    departureDate: '2024-07-28',
    noOfDays: 3,
    noOfPersons: 2,
    mobileNumber: '9876543210',
    rate: 150,
    roomId: '',
    remarks: 'Requires extra towels and quiet room.',
    includingGst: true,
  });

  useEffect(() => {
    fetchAvailableRooms();
    if (formData.reservationNo) {
      fetchAdvances();
    }
  }, [formData.reservationNo]);

  const fetchAvailableRooms = async () => {
    try {
      const response = await roomApi.getAvailableRooms();
      if (response.data.success) {
        setAvailableRooms(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch available rooms:', error);
    }
  };

  const fetchAdvances = async () => {
    try {
      const response = await advanceApi.getAdvancesByReservation(formData.reservationNo);
      if (response.data.success) {
        setAdvances(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch advances:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : 
               type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
        alert('Check-in processed successfully!');
        // Reset form
        setFormData({
          reservationNo: '',
          folioNo: '',
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
      }
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message || 'Failed to process check-in'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({
      reservationNo: '',
      folioNo: '',
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reservation Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="reservationNo"
                      value={formData.reservationNo}
                      onChange={handleInputChange}
                      disabled={isWalkIn}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    />
                  </div>
                </div>

                {/* Folio Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Folio Number
                  </label>
                  <input
                    type="text"
                    name="folioNo"
                    value={formData.folioNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Guest Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guest Name
                  </label>
                  <input
                    type="text"
                    name="guestName"
                    required
                    value={formData.guestName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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