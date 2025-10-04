import React, { useState, useEffect } from 'react';
import { Expense, AccountHead } from '../types/api';
import { transactionApi, masterDataApi, operationsApi } from '../services/api';

interface HotelExpenseEntryProps {
  onExpenseUpdated?: () => void;
  billNo?: string; // Optional bill number for bill-specific expenses
}

const HotelExpenseEntry: React.FC<HotelExpenseEntryProps> = ({ onExpenseUpdated, billNo }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    voucherNo: `EXP-${Date.now()}`, // Auto-generate voucher number
    date: new Date().toISOString().split('T')[0],
    accountHeadId: '',
    amount: 0,
    narration: '',
    shiftNo: '1',
    shiftDate: new Date().toISOString().split('T')[0],
  });
  const [shiftInfo, setShiftInfo] = useState({ shiftNo: '1', shiftDate: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    fetchExpenses();
    fetchAccountHeads();
    fetchShiftInfo();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await transactionApi.getExpenses();
      if (response.data.success) {
        setExpenses(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch expenses:', error);
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

  const fetchShiftInfo = async () => {
    try {
      const response = await operationsApi.getHmsystem();
      if (response.data.success && response.data.data) {
        const hmsData = response.data.data;
        const shiftNo = hmsData.runningShift?.toString() || '1';
        const shiftDate = hmsData.shiftDate || new Date().toISOString().split('T')[0];
        
        setShiftInfo({ shiftNo, shiftDate });
        
        // Update form data with shift info
        setFormData(prev => ({
          ...prev,
          shiftNo,
          shiftDate,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch shift info:', error);
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
      
      // Ensure shift info is current
      const submitData = {
        ...formData,
        shiftNo: shiftInfo.shiftNo,
        shiftDate: shiftInfo.shiftDate,
      };
      
      if (editingExpense) {
        // Validate expenseId
        if (!editingExpense.transactionId) {
          throw new Error('Expense ID is missing for update');
        }
        
        // Update existing expense
        const response = await transactionApi.updateExpense(editingExpense.transactionId!, {
          ...submitData,
          amount: submitData.amount,
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
      } else if (billNo) {
        // Create new expense for a specific bill
        const response = await transactionApi.createExpenseByBill(billNo, {
          ...submitData,
          amount: submitData.amount,
        });
        
        if (response.data.success) {
          alert('Expense created successfully for bill!');
          resetForm();
          fetchExpenses();
          onExpenseUpdated?.();
        } else {
          throw new Error(response.data.message || 'Failed to create expense for bill');
        }
      } else {
        // Create new general expense
        const response = await transactionApi.createExpense({
          ...submitData,
          amount: submitData.amount,
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
      voucherNo: expense.voucherNo || `EXP-${Date.now()}`,
      date: expense.date || new Date().toISOString().split('T')[0],
      accountHeadId: expense.accountHeadId || '',
      amount: expense.amount || 0,
      narration: expense.narration || '',
      shiftNo: expense.shiftNo || shiftInfo.shiftNo,
      shiftDate: expense.shiftDate || shiftInfo.shiftDate,
    });
  };

  const handleDelete = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }
    
    // Validate expenseId
    if (!expenseId) {
      alert('Expense ID is missing for delete operation');
      return;
    }
    
    try {
      setLoading(true);
      const response = await transactionApi.deleteExpense(expenseId);
      
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
      voucherNo: `EXP-${Date.now()}`, // Auto-generate new voucher number
      date: new Date().toISOString().split('T')[0],
      accountHeadId: '',
      amount: 0,
      narration: '',
      shiftNo: shiftInfo.shiftNo,
      shiftDate: shiftInfo.shiftDate,
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {editingExpense ? 'Edit Expense' : 'Add New Expense'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hidden fields - shift info and auto-generated voucher number */}
          <input type="hidden" name="voucherNo" value={formData.voucherNo} />
          <input type="hidden" name="shiftNo" value={formData.shiftNo} />
          <input type="hidden" name="shiftDate" value={formData.shiftDate} />
          
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
        </div>
      </form>
      
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Existing Expenses</h3>
        
        {loading ? (
          <div className="flex justify-center items-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Loading expenses...</span>
          </div>
        ) : expenses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No expenses found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Head</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.transactionId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.voucherNo || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getAccountHeadName(expense.accountHeadId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{expense.amount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {expense.narration || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
        )}
      </div>
    </div>
  );
};

export default HotelExpenseEntry;