import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { roomApi, transactionApi, masterDataApi } from '../services/api';
import { Room, AccountHead, Transaction } from '../types/api';

// Define FormState interface
interface FormState {
    roomId: string;
    accHeadId: string;
    amount: string;
    narration: string;
    voucherNo: string;
    includingGst: 'Y' | 'N';
}

const initialFormState: FormState = {
    roomId: '',
    accHeadId: '',
    amount: '',
    narration: '',
    voucherNo: '',
    includingGst: 'N',
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
    const [folioNumber, setFolioNumber] = useState('');
    const [guestName, setGuestName] = useState('');
    const [form, setForm] = useState<FormState>(initialFormState);
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [roomsRes, accountHeadsRes] = await Promise.all([
                    roomApi.getRooms(),
                    masterDataApi.getAccountHeads()
                ]);
                
                if (roomsRes.data.success) setRooms(roomsRes.data.data);
                if (accountHeadsRes.data.success) setAccountHeads(accountHeadsRes.data.data);
            } catch (error) {
                // Optionally handle error
            }
        };
        fetchData();
    }, []);

    // Fetch transactions when folio number changes
    useEffect(() => {
        const fetchTransactions = async () => {
            if (!folioNumber) {
                setTransactions([]);
                return;
            }
            
            setTransactionsLoading(true);
            try {
                const res = await transactionApi.getTransactionsByFolio(folioNumber);
                if (res.data.success) {
                    // Map account head names to transactions
                    const transactionsWithNames = res.data.data.map((transaction: any) => {
                        const accountHead = accountHeads.find(ah => ah.accHeadId === transaction.accHeadId);
                        return {
                            ...transaction,
                            accHeadName: accountHead ? accountHead.name : transaction.accHeadName || 'Unknown'
                        };
                    });
                    setTransactions(transactionsWithNames);
                }
            } catch (error) {
                console.error('Failed to fetch transactions:', error);
                setTransactions([]);
            } finally {
                setTransactionsLoading(false);
            }
        };
        
        fetchTransactions();
    }, [folioNumber, accountHeads]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));

        if (name === 'roomId') {
            const selectedRoom = rooms.find(r => r.roomId === value);
            setFolioNumber(selectedRoom?.folioNo || '');
            setGuestName(selectedRoom?.guestName || '');
        }
    };

    const handleIncludingGstChange = (includingGst: 'Y' | 'N') => {
        setForm(prev => ({ ...prev, includingGst }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!folioNumber || !guestName || !form.accHeadId || !form.amount) {
            alert('Please fill all required fields.');
            setLoading(false);
            return;
        }

        try {
            await transactionApi.createInhouseTransaction({
                folioNo: folioNumber,
                guestName,
                accHeadId: form.accHeadId,
                amount: Number(form.amount),
                narration: form.narration,
                voucherNo: form.voucherNo || undefined, // Only send if provided
                includingGst: form.includingGst,
            });
            alert('Transaction saved successfully!');
            handleClear();
        } catch (err) {
            alert('Failed to save transaction.');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setForm(initialFormState);
        setFolioNumber('');
        setGuestName('');
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
                            Record New Transaction
                        </h2>
                        <p className="text-gray-600 text-xs mt-1 ml-7">
                            Fill in the details below to record a new transaction.
                        </p>
                    </div>
                    <form className="p-4" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Room Number
                                </label>
                                <select
                                    name="roomId"
                                    value={form.roomId}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                >
                                    <option value="">Select Room</option>
                                    {rooms
                                      .slice() // Create a copy to avoid mutating the original array
                                      .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }))
                                      .map(r => (
                                        <option key={r.roomId} value={r.roomId}>
                                            {r.roomNo}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Folio Number
                                </label>
                                <input
                                    type="text"
                                    value={folioNumber}
                                    disabled
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Guest Name
                                </label>
                                <input
                                    type="text"
                                    value={guestName}
                                    disabled
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-xs"
                                />
                            </div>
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
                                      .slice() // Create a copy to avoid mutating the original array
                                      .sort((a, b) => a.name.localeCompare(b.name))
                                      .map(accountHead => (
                                        <option key={accountHead.accHeadId} value={accountHead.accHeadId}>
                                            {accountHead.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Amount
                                </label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={form.amount}
                                    onChange={handleChange}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                    placeholder="150.00"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Including GST
                                </label>
                                <div className="flex items-center space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            name="includingGst"
                                            value="Y"
                                            checked={form.includingGst === 'Y'}
                                            onChange={() => handleIncludingGstChange('Y')}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2 text-xs">Yes</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            name="includingGst"
                                            value="N"
                                            checked={form.includingGst === 'N'}
                                            onChange={() => handleIncludingGstChange('N')}
                                            className="form-radio h-4 w-4 text-indigo-600"
                                        />
                                        <span className="ml-2 text-xs">No</span>
                                    </label>
                                </div>
                            </div>
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
                        </div>
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
                </div>
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
            </div>
        </Layout>
    );
};

export default TransactionForm;