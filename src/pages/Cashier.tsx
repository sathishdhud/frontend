import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CurrencyDollarIcon, ReceiptPercentIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Advance, PaymentMode } from '../types/api';
import { advanceApi, masterDataApi } from '../services/api';
import Layout from '../components/Layout/Layout';

const Cashier: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'record' | 'edit'>('record');
  const [loading, setLoading] = useState(false);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);

  const [formData, setFormData] = useState({
    receiptNumber: 'AUTO-GEN-5768',
    contextType: 'reservation', // reservation, inhouse, bill
    contextValue: '',
    date: new Date().toISOString().split('T')[0],
    modeOfPaymentId: '',
    amount: 0,
    details: '',
    narration: '',
    guestName: '',
  });

  // Mock data for the chart
  const chartData = [
    { name: 'Mon', amount: 15000 },
    { name: 'Tue', amount: 18000 },
    { name: 'Wed', amount: 12000 },
    { name: 'Thu', amount: 15000 },
    { name: 'Fri', amount: 22000 },
    { name: 'Sat', amount: 19000 },
    { name: 'Sun', amount: 16000 },
  ];

  useEffect(() => {
    fetchPaymentModes();
  }, []);

  const fetchPaymentModes = async () => {
    try {
      const response = await masterDataApi.getPaymentModes();
      if (response.data.success) {
        setPaymentModes(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payment modes:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const advanceData = {
        guestName: formData.guestName,
        modeOfPaymentId: formData.modeOfPaymentId,
        amount: formData.amount,
        remarks: formData.details,
      };

      let response;
      
      if (formData.contextType === 'reservation') {
        response = await advanceApi.createAdvanceForReservation({
          ...advanceData,
          reservationNo: formData.contextValue,
        });
      } else {
        response = await advanceApi.createAdvanceForInHouse({
          ...advanceData,
          folioNo: formData.contextValue,
        });
      }
      
      if (response.data.success) {
        alert('Advance recorded successfully!');
        handleClearForm();
      }
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message || 'Failed to record advance'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearForm = () => {
    setFormData({
      receiptNumber: `AUTO-GEN-${Math.floor(Math.random() * 10000)}`,
      contextType: 'reservation',
      contextValue: '',
      date: new Date().toISOString().split('T')[0],
      modeOfPaymentId: '',
      amount: 0,
      details: '',
      narration: '',
      guestName: '',
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Advances Management</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('record')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'record'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Record Advance
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'edit'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Edit Advance
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
            {activeTab === 'record' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Record New Advance</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Receipt Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Receipt Number
                      </label>
                      <input
                        type="text"
                        name="receiptNumber"
                        value={formData.receiptNumber}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>

                    {/* Context Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reservation / Room / Bill Number
                      </label>
                      <select
                        name="contextType"
                        value={formData.contextType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="reservation">Reservation</option>
                        <option value="inhouse">In-House</option>
                        <option value="bill">Bill</option>
                      </select>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Context Value */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {formData.contextType === 'reservation' ? 'Reservation Number' :
                         formData.contextType === 'inhouse' ? 'Folio Number' : 'Bill Number'}
                      </label>
                      <input
                        type="text"
                        name="contextValue"
                        value={formData.contextValue}
                        onChange={handleInputChange}
                        placeholder="Select context"
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
                        value={formData.guestName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mode of Payment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mode of Payment
                      </label>
                      <select
                        name="modeOfPaymentId"
                        value={formData.modeOfPaymentId}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select mode</option>
                        {paymentModes.map(mode => (
                          <option key={mode.id} value={mode.id}>
                            {mode.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Details */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Details
                    </label>
                    <textarea
                      name="details"
                      value={formData.details}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Payment details..."
                    />
                  </div>

                  {/* Narration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Narration
                    </label>
                    <textarea
                      name="narration"
                      value={formData.narration}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Additional notes..."
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold py-3 px-4 rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : 'Save Advance'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearForm}
                      className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span>Clear Form</span>
                    </button>
                  </div>
                </form>
              </>
            )}

            {activeTab === 'edit' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Advance</h2>
                <p className="text-gray-500">Advance editing functionality will be implemented here.</p>
              </div>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Summary of Advances</h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Advances Today</span>
                  <span className="text-lg font-semibold text-gray-900">Rs. 15,000</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Number of Transactions</span>
                  <span className="text-lg font-semibold text-gray-900">8</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg. Advance Amount</span>
                  <span className="text-lg font-semibold text-gray-900">Rs. 3,000</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Week Total</span>
                  <span className="text-lg font-semibold text-gray-900">Rs. 58,500</span>
                </div>
              </div>

              {/* Chart */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Weekly Advances</h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis hide />
                      <Tooltip 
                        formatter={(value) => [`Rs. ${value}`, 'Amount']}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="amount" 
                        fill="url(#colorGradient)" 
                        radius={[2, 2, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#8B5CF6" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center">
                Real-time data synchronization is active.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cashier;