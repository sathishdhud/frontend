import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import ExpenseManager from '../components/ExpenseManager';
import { roomApi, transactionApi, masterDataApi, billApi, checkInApi, operationsApi } from '../services/api';
import { Room, AccountHead, Transaction, CheckIn } from '../types/api';

// Define FormState interface
interface FormState {
    roomId: string;
    accHeadId: string;
    amount: string;
    narration: string;
    voucherNo: string;
    includingGst: 'Y' | 'N';
    // Add fields for expense transaction
    date: string;
    shiftNo: string;
    shiftDate: string;
    // Fields for bill-wise transaction
    billNo: string;
    // Fields for room-wise transaction
    folioNo: string;
    guestName: string;
    roomNo: string;
}

const initialFormState: FormState = {
    roomId: '',
    accHeadId: '',
    amount: '',
    narration: '',
    voucherNo: '',
    includingGst: 'N',
    // Initialize expense fields
    date: new Date().toISOString().split('T')[0],
    shiftNo: '1', // This will be automatically set
    shiftDate: new Date().toISOString().split('T')[0], // This will be automatically set
    // Initialize bill-wise fields
    billNo: '',
    // Initialize room-wise fields
    folioNo: '',
    guestName: '',
    roomNo: '',
};

// Custom Date Input Component with Calendar Icon
const DateInput = ({ name, value, onChange, label, required }: { 
  name: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  label: string; 
  required?: boolean; 
}) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {label} {required && "*"}
    </label>
    <div className="relative">
      <input
        type="date"
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        className="w-full px-2 py-1.5 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>
    </div>
  </div>
);

const TransactionForm: React.FC = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
    const [form, setForm] = useState<FormState>(initialFormState);
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    // Add state for active tab including expenses
    const [activeTab, setActiveTab] = useState<'bill' | 'room' | 'expenses'>('bill');
    // Add state for auto-fill loading
    const [autoFillLoading, setAutoFillLoading] = useState(false);
    // Add state for error messages
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [roomsRes, accountHeadsRes, hmsystemRes] = await Promise.all([
                    roomApi.getRooms(),
                    masterDataApi.getAccountHeads(),
                    operationsApi.getHmsystem().catch(() => null) // Don't fail if HMS system info is not available
                ]);
                
                if (roomsRes.data.success) setRooms(roomsRes.data.data);
                if (accountHeadsRes.data.success) setAccountHeads(accountHeadsRes.data.data);
                
                // Update shift information if available
                if (hmsystemRes && hmsystemRes.data.success && hmsystemRes.data.data) {
                    const hmsData = hmsystemRes.data.data;
                    setForm(prev => ({
                        ...prev,
                        shiftNo: hmsData.shiftNo || prev.shiftNo,
                        shiftDate: hmsData.shiftDate || prev.shiftDate
                    }));
                }
            } catch (error) {
                // Optionally handle error
            }
        };
        fetchData();
    }, []);

    // Auto-fill function for bill number
    const autoFillByBillNo = async (billNo: string) => {
        if (!billNo) {
            setForm(prev => ({
                ...prev,
                folioNo: '',
                guestName: '',
                roomNo: ''
            }));
            return;
        }
        
        setAutoFillLoading(true);
        try {
            // Try to get bill details
            const billResponse = await billApi.getBillByBillNo(billNo);
            if (billResponse.data.success && billResponse.data.data) {
                const billData = billResponse.data.data;
                setForm(prev => ({
                    ...prev,
                    folioNo: billData.folioNo || '',
                    guestName: billData.guestName || '',
                    roomNo: billData.roomNo || ''
                }));
            } else {
                // If bill not found, clear fields
                setForm(prev => ({
                    ...prev,
                    folioNo: '',
                    guestName: '',
                    roomNo: ''
                }));
                setError('Bill not found');
            }
        } catch (err) {
            setForm(prev => ({
                ...prev,
                folioNo: '',
                guestName: '',
                roomNo: ''
            }));
            setError('Failed to fetch bill details');
        } finally {
            setAutoFillLoading(false);
        }
    };

    // Auto-fill function for room number
    const autoFillByRoomNo = async (roomId: string) => {
        if (!roomId) {
            setForm(prev => ({
                ...prev,
                folioNo: '',
                guestName: '',
                roomNo: ''
            }));
            return;
        }
        
        try {
            // Get room details
            const roomResponse = await roomApi.getRoomById(roomId);
            if (roomResponse.data.success && roomResponse.data.data) {
                const roomData = roomResponse.data.data;
                setForm(prev => ({
                    ...prev,
                    roomNo: roomData.roomNo || '',
                    folioNo: roomData.folioNo || '',
                }));
                
                // Get guest name if folio number exists
                if (roomData.folioNo) {
                    const checkInResponse = await checkInApi.getCheckInByFolio(roomData.folioNo);
                    if (checkInResponse.data.success && checkInResponse.data.data) {
                        setForm(prev => ({
                            ...prev,
                            guestName: checkInResponse.data.data.guestName || ''
                        }));
                    }
                }
            }
        } catch (err) {
            setError('Failed to fetch room details');
        }
    };

    // Check if guest has checked out
    const isGuestCheckedOut = async (roomId: string): Promise<boolean> => {
        try {
            const checkInResponse = await checkInApi.getCheckInByRoom(roomId);
            if (checkInResponse.data.success && checkInResponse.data.data) {
                const checkInData: CheckIn = checkInResponse.data.data;
                // If checkout field exists and is true, guest has checked out
                return checkInData.checkout === true;
            }
            return false;
        } catch (err) {
            console.error('Failed to check guest checkout status:', err);
            return false; // Assume not checked out if we can't determine
        }
    };

    // Handle input changes
    const handleChange = async (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        
        // Clear error when user starts typing
        if (error) setError('');

        // Handle auto-fill based on which field changed
        if (name === 'billNo' && activeTab === 'bill') {
            // Debounce the auto-fill call
            setTimeout(() => {
                autoFillByBillNo(value);
            }, 300);
        } else if (name === 'roomId' && activeTab === 'room') {
            // Check if guest has checked out when room is selected
            if (value) {
                const isCheckout = await isGuestCheckedOut(value);
                if (isCheckout) {
                    alert('Cannot create transaction for checked-out guest.');
                    // Clear the room selection
                    setForm(prev => ({ ...prev, roomId: '' }));
                    return;
                }
            }
            autoFillByRoomNo(value);
        }
    };

    const handleIncludingGstChange = (includingGst: 'Y' | 'N') => {
        setForm(prev => ({ ...prev, includingGst }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Validation
            if (!form.accHeadId || !form.amount) {
                setError('Please fill all required fields.');
                setLoading(false);
                return;
            }

            const amount = Number(form.amount);
            if (isNaN(amount) || amount <= 0) {
                setError('Please enter a valid amount.');
                setLoading(false);
                return;
            }

            // Handle bill-wise transaction
            if (activeTab === 'bill') {
                if (!form.billNo) {
                    setError('Please enter a bill number.');
                    setLoading(false);
                    return;
                }

                // Create expense transaction for bill using the correct API method
                // Note: The Expense interface doesn't include billNo, folioNo, roomNo, guestName
                // These are for reference only and not sent to the API
                await transactionApi.createExpense({
                    voucherNo: form.voucherNo || `EXP-${new Date().getTime()}`,
                    date: form.date,
                    accountHeadId: form.accHeadId,
                    amount: amount,
                    narration: form.narration,
                    shiftNo: form.shiftNo,
                    shiftDate: form.shiftDate
                });
                
                alert('Expense saved successfully for bill!');
                handleClear();
                return;
            }

            // Handle room-wise transaction
            if (activeTab === 'room') {
                if (!form.roomId) {
                    setError('Please select a room.');
                    setLoading(false);
                    return;
                }

                // Check if guest has checked out
                const isCheckout = await isGuestCheckedOut(form.roomId);
                if (isCheckout) {
                    alert('Cannot create transaction for checked-out guest.');
                    setLoading(false);
                    return;
                }

                // Create expense transaction for room using the correct API method
                // Note: The Expense interface doesn't include billNo, folioNo, roomNo, guestName
                // These are for reference only and not sent to the API
                await transactionApi.createExpense({
                    voucherNo: form.voucherNo || `EXP-${new Date().getTime()}`,
                    date: form.date,
                    accountHeadId: form.accHeadId,
                    amount: amount,
                    narration: form.narration,
                    shiftNo: form.shiftNo,
                    shiftDate: form.shiftDate
                });
                
                alert('Expense saved successfully for room!');
                handleClear();
                return;
            }

            // Fallback to existing inhouse transaction logic
            if (!form.folioNo || !form.guestName || !form.accHeadId || !form.amount) {
                setError('Please fill all required fields.');
                setLoading(false);
                return;
            }

            // Check if guest has checked out (for inhouse transactions)
            if (form.roomId) {
                const isCheckout = await isGuestCheckedOut(form.roomId);
                if (isCheckout) {
                    alert('Cannot create transaction for checked-out guest.');
                    setLoading(false);
                    return;
                }
            }

            await transactionApi.createInhouseTransaction({
                folioNo: form.folioNo,
                guestName: form.guestName,
                accHeadId: form.accHeadId,
                amount: Number(form.amount),
                narration: form.narration,
                voucherNo: form.voucherNo || undefined,
                includingGst: form.includingGst,
            });
            
            alert('Transaction saved successfully!');
            handleClear();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save transaction.');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setForm(initialFormState);
        setTransactions([]);
        setError('');
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto mt-8">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Record New Expense Transaction
                        </h2>
                        <p className="text-gray-600 text-xs mt-1 ml-7">
                            Fill in the details below to record a new expense transaction.
                        </p>
                    </div>
                    
                    {/* Tabs for Bill-wise, Room-wise, and Expenses Management */}
                    <div className="flex border-b border-gray-200">
                        <button
                            type="button"
                            onClick={() => setActiveTab('bill')}
                            className={`px-4 py-3 text-sm font-medium flex-1 text-center transition-colors ${
                                activeTab === 'bill'
                                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                        >
                            Bill-wise Transaction
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('room')}
                            className={`px-4 py-3 text-sm font-medium flex-1 text-center transition-colors ${
                                activeTab === 'room'
                                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                        >
                            Room-wise Transaction
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('expenses')}
                            className={`px-4 py-3 text-sm font-medium flex-1 text-center transition-colors ${
                                activeTab === 'expenses'
                                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                        >
                            Manage Expenses
                        </button>
                    </div>
                    
                    <div className="p-4">
                        {/* Expense Manager Tab */}
                        {activeTab === 'expenses' ? (
                            <ExpenseManager onExpenseUpdated={() => {
                                // Refresh transactions if needed
                            }} />
                        ) : (
                            <form onSubmit={handleSubmit}>
                                {/* Error message */}
                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                                        {error}
                                    </div>
                                )}
                                
                                {/* Bill-wise Transaction Form */}
                                {activeTab === 'bill' && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* Bill Number */}
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Bill Number *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    name="billNo"
                                                    value={form.billNo}
                                                    onChange={handleChange}
                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                                    placeholder="Enter bill number"
                                                    required
                                                />
                                                {autoFillLoading && (
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Auto-filled fields */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Folio Number
                                            </label>
                                            <input
                                                type="text"
                                                name="folioNo"
                                                value={form.folioNo}
                                                onChange={handleChange}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-xs"
                                                disabled
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Guest Name
                                            </label>
                                            <input
                                                type="text"
                                                name="guestName"
                                                value={form.guestName}
                                                onChange={handleChange}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-xs"
                                                disabled
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Room Number
                                            </label>
                                            <input
                                                type="text"
                                                name="roomNo"
                                                value={form.roomNo}
                                                onChange={handleChange}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-xs"
                                                disabled
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                {/* Room-wise Transaction Form */}
                                {activeTab === 'room' && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* Room selection */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Room Number *
                                            </label>
                                            <select
                                                name="roomId"
                                                value={form.roomId}
                                                onChange={handleChange}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                                required
                                            >
                                                <option value="">Select Room</option>
                                                {rooms
                                                  .slice()
                                                  .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }))
                                                  .map(r => (
                                                    <option key={r.roomId} value={r.roomId}>
                                                        {r.roomNo}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        {/* Auto-filled fields */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Folio Number
                                            </label>
                                            <input
                                                type="text"
                                                name="folioNo"
                                                value={form.folioNo}
                                                onChange={handleChange}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-xs"
                                                disabled
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Guest Name
                                            </label>
                                            <input
                                                type="text"
                                                name="guestName"
                                                value={form.guestName}
                                                onChange={handleChange}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-xs"
                                                disabled
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Room Number
                                            </label>
                                            <input
                                                type="text"
                                                name="roomNo"
                                                value={form.roomNo}
                                                onChange={handleChange}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-xs"
                                                disabled
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                {/* Common fields for both tabs */}
                                {(activeTab === 'bill' || activeTab === 'room') && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                                        {/* Date */}
                                        <DateInput 
                                            name="date"
                                            value={form.date}
                                            onChange={handleChange}
                                            label="Date"
                                            required
                                        />
                                        
                                        {/* Account Head */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Account Head *
                                            </label>
                                            <select
                                                name="accHeadId"
                                                value={form.accHeadId}
                                                onChange={handleChange}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                                required
                                            >
                                                <option value="">Select Account Head</option>
                                                {accountHeads
                                                  .slice()
                                                  .sort((a, b) => a.name.localeCompare(b.name))
                                                  .map(accountHead => (
                                                    <option key={accountHead.accHeadId} value={accountHead.accHeadId}>
                                                        {accountHead.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        {/* Amount */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Amount *
                                            </label>
                                            <input
                                                type="number"
                                                name="amount"
                                                value={form.amount}
                                                onChange={handleChange}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                                placeholder="150.00"
                                                required
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        
                                        {/* Voucher Number */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Voucher Number
                                            </label>
                                            <input
                                                type="text"
                                                name="voucherNo"
                                                value={form.voucherNo}
                                                onChange={handleChange}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                                placeholder="Enter voucher number (optional)"
                                            />
                                        </div>
                                        
                                        {/* Narration */}
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Narration (Optional)
                                            </label>
                                            <textarea
                                                name="narration"
                                                value={form.narration}
                                                onChange={handleChange}
                                                rows={2}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                                placeholder="Add any additional notes for this transaction..."
                                            />
                                        </div>
                                        
                                        {/* Hidden Shift Information - Automatically populated */}
                                        <input type="hidden" name="shiftNo" value={form.shiftNo} />
                                        <input type="hidden" name="shiftDate" value={form.shiftDate} />
                                    </div>
                                )}
                                
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleClear}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium flex items-center"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                        </svg>
                                        Clear
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-xs font-medium flex items-center shadow-md"
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                </svg>
                                                Save Transaction
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
                
                {/* Recent Transactions Section - Only show for room-wise transactions */}
                {activeTab === 'room' && form.folioNo && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-6">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions for Folio</h3>
                        </div>
                        <div className="p-4">
                            {transactionsLoading ? (
                                <div className="flex justify-center items-center py-6">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    <span className="ml-2 text-gray-600">Loading transactions...</span>
                                </div>
                            ) : transactions.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Head</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {transactions.map((transaction, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                                                        {transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                                                        {transaction.accHeadName}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                                                        ₹{transaction.amount?.toFixed(2) || '0.00'}
                                                    </td>
                                                    <td className="px-4 py-2 text-xs text-gray-900 max-w-xs truncate">
                                                        {transaction.narration || '-'}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                                                        {transaction.transactionId || '-'}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                                                        {transaction.billNo || '-'}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
                                                        {transaction.voucherNo || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-gray-500 text-center py-6">No recent transactions for this folio.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default TransactionForm;