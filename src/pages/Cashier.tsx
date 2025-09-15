import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Advance, PaymentMode } from '../types/api';
import { advanceApi, masterDataApi } from '../services/api';
import Layout from '../components/Layout/Layout';

const Cashier: React.FC = () => {

  const [activeTab, setActiveTab] = useState<'record' | 'edit'>('record');
  const [loading, setLoading] = useState(false);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [contextOptions, setContextOptions] = useState<any[]>([]); // Reservation/Folio/Bill options
  const [formData, setFormData] = useState({
    receiptNumber: `AUTO-GEN-${Math.floor(Math.random() * 9000 + 1000)}`,
    contextValue: '',
    date: new Date().toISOString().split('T')[0],
    modeOfPaymentId: '',
    amount: 0,
    details: '',
    narration: '',
    guestName: '',
  });
  // Summary state
  const [summary, setSummary] = useState({
    totalToday: 0,
    transactionCount: 0,
    avgAmount: 0,
    lastWeekTotal: 0,
    chartData: [] as { name: string; amount: number }[],
  });


  useEffect(() => {
    fetchPaymentModes();
    fetchSummary();
    // fetchContextOptions(); // Optionally implement autocomplete/search for context
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

  // Fetch summary data for advances (replace with real API call)
  const fetchSummary = async () => {
    try {
      
      setSummary({
        totalToday: 15000,
        transactionCount: 8,
        avgAmount: 3000,
        lastWeekTotal: 58500,
        chartData: [
          { name: 'Mon', amount: 15000 },
          { name: 'Tue', amount: 18000 },
          { name: 'Wed', amount: 12000 },
          { name: 'Thu', amount: 15000 },
          { name: 'Fri', amount: 22000 },
          { name: 'Sat', amount: 19000 },
          { name: 'Sun', amount: 16000 },
        ],
      });
    } catch (error) {
      // fallback to zeros
      setSummary({
        totalToday: 0,
        transactionCount: 0,
        avgAmount: 0,
        lastWeekTotal: 0,
        chartData: [],
      });
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
      // Determine context type by prefix (simple logic, can be improved)
      let response;
      const advanceData = {
        guestName: formData.guestName,
        modeOfPaymentId: formData.modeOfPaymentId,
        amount: formData.amount,
        remarks: formData.details,
      };
      if (/^F/i.test(formData.contextValue)) {
        // Folio (inhouse)
        response = await advanceApi.createAdvanceForInHouse({
          ...advanceData,
          folioNo: formData.contextValue,
        });
      } else if (/^B/i.test(formData.contextValue)) {
        // Bill
        // TODO: Implement bill advance API if available
        alert('Bill advances not implemented in API.');
        setLoading(false);
        return;
      } else {
        // Reservation
        response = await advanceApi.createAdvanceForReservation({
          ...advanceData,
          reservationNo: formData.contextValue,
        });
      }
      if (response?.data?.success) {
        alert('Advance recorded successfully!');
        handleClearForm();
        fetchSummary();
      }
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message || 'Failed to record advance'}`);
    } finally {
      setLoading(false);
    }
  };


  const handleClearForm = () => {
    setFormData({
      receiptNumber: `AUTO-GEN-${Math.floor(Math.random() * 9000 + 1000)}`,
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
          <h1 className="text-2xl font-bold text-gray-900">Advances Management</h1>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('record')}
              className={`px-6 py-2 font-medium transition-colors focus:outline-none ${
                activeTab === 'record'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Record Advance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-6 py-2 font-medium transition-colors focus:outline-none ${
                activeTab === 'edit'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
              disabled
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

                    {/* Context Dropdown (single field) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reservation / Room / Bill Number
                      </label>
                      <input
                        type="text"
                        name="contextValue"
                        value={formData.contextValue}
                        onChange={handleInputChange}
                        placeholder="Select context"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Additional notes..."
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <span className="text-lg font-semibold text-gray-900">Rs. {summary.totalToday.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Number of Transactions</span>
                  <span className="text-lg font-semibold text-gray-900">{summary.transactionCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg. Advance Amount</span>
                  <span className="text-lg font-semibold text-gray-900">Rs. {summary.avgAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Week Total</span>
                  <span className="text-lg font-semibold text-gray-900">Rs. {summary.lastWeekTotal.toLocaleString()}</span>
                </div>
              </div>
              {/* Chart */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Weekly Advances</h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.chartData}>
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