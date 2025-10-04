import React, { useState, useEffect } from 'react';
import { transactionApi, masterDataApi } from '../services/api';
import { SalesReceipt, PaymentMode } from '../types/api';

interface SalesReceiptsProps {
  onSalesUpdated?: () => void;
}

const SalesReceipts: React.FC<SalesReceiptsProps> = ({ onSalesUpdated }) => {
  const [salesReceipts, setSalesReceipts] = useState<SalesReceipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<SalesReceipt[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    receiptNo: `R-${Math.floor(Math.random() * 9000 + 1000)}`,
    date: new Date().toISOString().split('T')[0],
    modeOfPaymentId: '',
    amount: 0,
    voucherNo: '',
    narration: '',
    shiftNo: '1',
    shiftDate: new Date().toISOString().split('T')[0],
  });
  
  // Add state for search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    fetchSalesReceipts();
    fetchPaymentModes();
  }, []);

  // Filter receipts when search term or date changes
  useEffect(() => {
    let filtered = salesReceipts;
    
    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(receipt => 
        (receipt.receiptNo && receipt.receiptNo.toLowerCase().includes(term)) ||
        (receipt.voucherNo && receipt.voucherNo.toLowerCase().includes(term)) ||
        (receipt.modeOfPaymentName && receipt.modeOfPaymentName.toLowerCase().includes(term))
      );
    }
    
    // Apply date filter
    if (searchDate) {
      filtered = filtered.filter(receipt => {
        if (!receipt.date) return false;
        const receiptDate = new Date(receipt.date).toISOString().split('T')[0];
        return receiptDate === searchDate;
      });
    }
    
    setFilteredReceipts(filtered);
  }, [salesReceipts, searchTerm, searchDate]);

  const fetchSalesReceipts = async () => {
    try {
      setLoading(true);
      const response = await transactionApi.getSalesReceipts();
      if (response.data.success) {
        setSalesReceipts(response.data.data);
        setFilteredReceipts(response.data.data); // Initialize filtered receipts
      }
    } catch (error: any) {
      console.error('Failed to fetch sales receipts:', error);
    } finally {
      setLoading(false);
    }
  };

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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Create new sales receipt
      const response = await transactionApi.createSalesReceipt({
        ...formData,
        amount: formData.amount,
      });
      
      if (response.data.success) {
        alert('Sales receipt created successfully!');
        // Generate new receipt number for next entry
        setFormData(prev => ({
          ...prev,
          receiptNo: `AUTO-GEN-${Math.floor(Math.random() * 9000 + 1000)}`,
          amount: 0,
          narration: '',
          voucherNo: '',
        }));
        fetchSalesReceipts();
        onSalesUpdated?.();
      } else {
        throw new Error(response.data.message || 'Failed to create sales receipt');
      }
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message || error.message || 'Operation failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      receiptNo: `AUTO-GEN-${Math.floor(Math.random() * 9000 + 1000)}`,
      date: new Date().toISOString().split('T')[0],
      modeOfPaymentId: '',
      amount: 0,
      voucherNo: '',
      narration: '',
      shiftNo: '1',
      shiftDate: new Date().toISOString().split('T')[0],
    });
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Filtering is handled by useEffect
  };
  
  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchDate('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Sales Receipts</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receipt Number
            </label>
            <input
              type="text"
              name="receiptNo"
              value={formData.receiptNo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mode of Payment *
            </label>
            <select
              name="modeOfPaymentId"
              value={formData.modeOfPaymentId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            >
              <option value="">Select Payment Mode</option>
              {paymentModes.map(mode => (
                <option key={mode.id} value={mode.id}>
                  {mode.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voucher Number
            </label>
            <input
              type="text"
              name="voucherNo"
              value={formData.voucherNo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter voucher number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift Number
            </label>
            <input
              type="text"
              name="shiftNo"
              value={formData.shiftNo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Narration
            </label>
            <textarea
              name="narration"
              value={formData.narration}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter narration (optional)"
            />
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Add Sales Receipt'}
          </button>
          
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Reset
          </button>
        </div>
      </form>
      
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Existing Sales Receipts</h3>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by receipt or voucher number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear
            </button>
          </div>
        </form>
        
        {loading ? (
          <div className="flex justify-center items-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Loading sales receipts...</span>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            {searchTerm || searchDate ? 'No sales receipts found matching your search criteria.' : 'No sales receipts found.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.receiptNo} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.receiptNo || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.date ? new Date(receipt.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.modeOfPaymentName || receipt.modeOfPaymentId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{receipt.amount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {receipt.voucherNo || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {receipt.narration || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesReceipts;