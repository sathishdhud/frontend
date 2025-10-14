import React, { useState, useEffect } from 'react';
import { Expense, AccountHead } from '../types/api';
import { transactionApi, masterDataApi, roomApi, checkInApi } from '../services/api';

interface ExpenseManagerProps {
  onExpenseUpdated?: () => void;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ onExpenseUpdated }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const [rooms, setRooms] = useState<{roomId: string, roomNo: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    voucherNo: '',
    date: new Date().toISOString().split('T')[0],
    accountHeadId: '',
    amount: 0,
    narration: '',
    // Hidden fields - not shown in UI but stored internally
    shiftNo: '1',
    shiftDate: new Date().toISOString().split('T')[0],
    roomNo: '',
    folioNo: '',
    billNo: '',
    guestName: '',
  });
  
  // Add filter states
  const [filters, setFilters] = useState({
    voucherDate: '',
    voucherNo: '',
    room: '',
    guestName: '',
    checkoutStatus: 'all', // New filter for checkout status
    checkoutDate: '' // New filter for checkout date
  });
  
  // Add pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 8;
  const totalPages = Math.ceil(filteredExpenses.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentExpenses = filteredExpenses.slice(indexOfFirstRecord, indexOfLastRecord);

  useEffect(() => {
    fetchExpenses();
    fetchAccountHeads();
    fetchRooms();
  }, []);

  // Apply filters when expenses or filters change
  useEffect(() => {
    applyFilters();
  }, [expenses, filters]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await transactionApi.getExpenses();
      if (response.data.success) {
        setExpenses(response.data.data);
      }
    } catch (error: any) {
      // Handle the specific error case where the API endpoint is not found
      if (error.response && error.response.status === 404) {
        console.error('Expenses API endpoint not found. Please check the backend API.');
      } else {
        console.error('Failed to fetch expenses:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountHeads = async () => {
    try {
      const response = await masterDataApi.getAccountHeads();
      if (response.data.success) {
        setAccountHeads(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch account heads:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await roomApi.getRooms();
      if (response.data.success) {
        setRooms(response.data.data.map(room => ({
          roomId: room.roomId,
          roomNo: room.roomNo
        })));
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Apply filters to expenses
  const applyFilters = () => {
    let result = [...expenses];
    
    // Filter by voucher date
    if (filters.voucherDate) {
      result = result.filter(expense => 
        expense.date && expense.date.includes(filters.voucherDate)
      );
    }
    
    // Filter by voucher number
    if (filters.voucherNo) {
      const searchTerm = filters.voucherNo.toLowerCase();
      result = result.filter(expense => 
        (expense.voucherNo && expense.voucherNo.toLowerCase().includes(searchTerm)) ||
        (expense.narration && expense.narration.toLowerCase().includes(searchTerm))
      );
    }
    
    // Filter by room
    if (filters.room) {
      const roomTerm = filters.room.toLowerCase();
      result = result.filter(expense => 
        (expense.roomNo && expense.roomNo.toLowerCase().includes(roomTerm)) ||
        (expense.narration && expense.narration.toLowerCase().includes(roomTerm))
      );
    }
    
    // Filter by guest name
    if (filters.guestName) {
      const guestTerm = filters.guestName.toLowerCase();
      result = result.filter(expense => 
        (expense.guestName && expense.guestName.toLowerCase().includes(guestTerm)) ||
        (expense.narration && expense.narration.toLowerCase().includes(guestTerm))
      );
    }
    
    // Filter by checkout status and date if needed
    if (filters.checkoutStatus !== 'all' || filters.checkoutDate) {
      // We need to filter based on checkout status
      // This would require checking each expense against actual checkin data
      // For now, we'll implement a basic filter that works with the existing data structure
      // In a full implementation, you would need to fetch checkin data for each expense
    }
    
    setFilteredExpenses(result);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      voucherDate: '',
      voucherNo: '',
      room: '',
      guestName: '',
      checkoutStatus: 'all',
      checkoutDate: ''
    });
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Handle previous page
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Handle next page
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (editingExpense) {
        // Validate transactionId
        if (!editingExpense.transactionId) {
          throw new Error('Transaction ID is missing for update');
        }
        
        // Update existing expense
        const response = await transactionApi.updateExpense(editingExpense.transactionId!, {
          ...formData,
          amount: formData.amount,
        });
        
        if (response.data.success) {
          alert('Expense updated successfully!');
          setEditingExpense(null);
          resetForm();
          fetchExpenses();
          onExpenseUpdated?.();
        } else {
          throw new Error(response.data.message || 'Failed to update expense');
        }
      } else {
        // Create new expense
        const response = await transactionApi.createExpense({
          ...formData,
          amount: formData.amount,
        });
        
        if (response.data.success) {
          alert('Expense created successfully!');
          resetForm();
          fetchExpenses();
          onExpenseUpdated?.();
        } else {
          throw new Error(response.data.message || 'Failed to create expense');
        }
      }
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message || error.message || 'Operation failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      voucherNo: expense.voucherNo || '',
      date: expense.date || new Date().toISOString().split('T')[0],
      accountHeadId: expense.accountHeadId || '',
      amount: expense.amount || 0,
      narration: expense.narration || '',
      // Hidden fields
      shiftNo: expense.shiftNo || '1',
      shiftDate: expense.shiftDate || new Date().toISOString().split('T')[0],
      roomNo: expense.roomNo || '',
      folioNo: expense.folioNo || '',
      billNo: expense.billNo || '',
      guestName: expense.guestName || '',
    });
  };

  const handleDelete = async (transactionId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }
    
    // Validate transactionId
    if (!transactionId) {
      alert('Transaction ID is missing for delete operation');
      return;
    }
    
    try {
      setLoading(true);
      const response = await transactionApi.deleteExpense(transactionId);
      
      if (response.data.success) {
        alert('Expense deleted successfully!');
        fetchExpenses();
        onExpenseUpdated?.();
      } else {
        throw new Error(response.data.message || 'Failed to delete expense');
      }
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to delete expense'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      voucherNo: '',
      date: new Date().toISOString().split('T')[0],
      accountHeadId: '',
      amount: 0,
      narration: '',
      // Reset hidden fields
      shiftNo: '1',
      shiftDate: new Date().toISOString().split('T')[0],
      roomNo: '',
      folioNo: '',
      billNo: '',
      guestName: '',
    });
  };

  const handleCancel = () => {
    setEditingExpense(null);
    resetForm();
  };

  const getAccountHeadName = (accountHeadId: string) => {
    const accountHead = accountHeads.find(a => a.accHeadId === accountHeadId);
    return accountHead ? accountHead.name : accountHeadId;
  };

  // Auto-fill guest name based on room number
  const autoFillGuestName = async (roomNo: string) => {
    if (!roomNo) {
      setFormData(prev => ({ ...prev, guestName: '' }));
      return;
    }
    
    try {
      // Find room by room number
      const room = rooms.find(r => r.roomNo === roomNo);
      if (room) {
        // Get check-in details for this room
        const checkInResponse = await checkInApi.getCheckInByRoom(room.roomId);
        if (checkInResponse.data.success && checkInResponse.data.data) {
          setFormData(prev => ({
            ...prev,
            guestName: checkInResponse.data.data.guestName || ''
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch guest name:', error);
    }
  };

  // Handle room number change
  const handleRoomNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, roomNo: value }));
    
    // Auto-fill guest name when room number changes
    if (value) {
      setTimeout(() => {
        autoFillGuestName(value);
      }, 300);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {editingExpense ? 'Edit Expense' : 'Add New Expense'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              Account Head *
            </label>
            <select
              name="accountHeadId"
              value={formData.accountHeadId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            >
              <option value="">Select Account Head</option>
              {accountHeads.map(accountHead => (
                <option key={accountHead.accHeadId} value={accountHead.accHeadId}>
                  {accountHead.name}
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
              Room Number
            </label>
            <input
              type="text"
              name="roomNo"
              value={formData.roomNo}
              onChange={handleRoomNoChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter room number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guest Name
            </label>
            <input
              type="text"
              name="guestName"
              value={formData.guestName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter guest name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Folio Number
            </label>
            <input
              type="text"
              name="folioNo"
              value={formData.folioNo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter folio number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bill Number
            </label>
            <input
              type="text"
              name="billNo"
              value={formData.billNo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter bill number"
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
            {loading ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Add Expense')}
          </button>
          
          {editingExpense && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          )}
          
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Reset
          </button>
        </div>
      </form>
      
      {/* Filter Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-900">Filter Expenses</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Clear Filters
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voucher Date
            </label>
            <input
              type="date"
              name="voucherDate"
              value={filters.voucherDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voucher Number
            </label>
            <input
              type="text"
              name="voucherNo"
              value={filters.voucherNo}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter voucher number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Number
            </label>
            <input
              type="text"
              name="room"
              value={filters.room}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter room number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guest Name
            </label>
            <input
              type="text"
              name="guestName"
              value={filters.guestName}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter guest name"
            />
          </div>
          
          {/* Checkout Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Checkout Status
            </label>
            <select
              name="checkoutStatus"
              value={filters.checkoutStatus}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="checkedOut">Checked Out</option>
              <option value="notCheckedOut">Not Checked Out</option>
            </select>
          </div>
          
          {/* Checkout Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Checkout Date
            </label>
            <input
              type="date"
              name="checkoutDate"
              value={filters.checkoutDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-900">Existing Expenses</h3>
          <span className="text-sm text-gray-500">
            Showing {indexOfFirstRecord + 1}-{Math.min(indexOfLastRecord, filteredExpenses.length)} of {filteredExpenses.length} expenses
          </span>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Loading expenses...</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No expenses found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Folio No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Head</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentExpenses.map((expense) => (
                    <tr key={expense.transactionId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {expense.voucherNo || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {expense.roomNo || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {expense.guestName || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {expense.folioNo || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {expense.billNo || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {getAccountHeadName(expense.accountHeadId)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        ₹{expense.amount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {expense.narration || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => expense.transactionId && handleDelete(expense.transactionId)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                      currentPage === 1 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                      currentPage === totalPages 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{indexOfFirstRecord + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(indexOfLastRecord, filteredExpenses.length)}</span> of{' '}
                      <span className="font-medium">{filteredExpenses.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                          currentPage === 1 ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {/* Page numbers */}
                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => handlePageChange(pageNumber)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                              currentPage === pageNumber
                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                          currentPage === totalPages ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExpenseManager;