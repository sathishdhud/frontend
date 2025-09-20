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
                        const accountHead = accountHeads.find(ah => ah.accountHeadId === transaction.accHeadId);
                        return {
                            ...transaction,
                            accHeadName: accountHead ? accountHead.accountName : transaction.accHeadName || 'Unknown'
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
            <div className="max-w-5xl mx-auto mt-8">
                <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
                    <h2 className="text-2xl font-bold mb-6">Record New Transaction</h2>
                    <form className="grid grid-cols-1 md:grid-cols-3 gap-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium mb-2">Room Number</label>
                            <select
                                name="roomId"
                                value={form.roomId}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2"
                            >
                                <option value="">Select Room</option>
                                {rooms.map(r => (
                                    <option key={r.roomId} value={r.roomId}>
                                        {r.roomNo}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Folio Number</label>
                            <input
                                type="text"
                                value={folioNumber}
                                disabled
                                className="w-full border rounded-lg px-3 py-2 bg-gray-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Guest Name</label>
                            <input
                                type="text"
                                value={guestName}
                                disabled
                                className="w-full border rounded-lg px-3 py-2 bg-gray-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Acc Head *</label>
                            <select
                                name="accHeadId"
                                value={form.accHeadId}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2"
                                required
                            >
                                <option value="">Select Account Head</option>
                                {accountHeads.map(accountHead => (
                                    <option key={accountHead.accountHeadId} value={accountHead.accountHeadId}>
                                        {accountHead.accountName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Amount</label>
                            <input
                                type="number"
                                name="amount"
                                value={form.amount}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Including GST</label>
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
                                    <span className="ml-2">Yes</span>
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
                                    <span className="ml-2">No</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Voucher Number</label>
                            <input
                                type="text"
                                name="voucherNo"
                                value={form.voucherNo}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="Enter voucher number (optional)"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium mb-2">Narration (Optional)</label>
                            <textarea
                                name="narration"
                                value={form.narration}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="Add any additional notes for this transaction..."
                            />
                        </div>
                        <div className="flex items-end space-x-4 md:col-span-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-indigo-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-600"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="border border-gray-300 px-6 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Clear
                            </button>
                        </div>
                    </form>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                    <h3 className="text-lg font-semibold mb-4">Recent Transactions for Folio</h3>
                    {transactionsLoading ? (
                        <div className="text-gray-500">Loading transactions...</div>
                    ) : transactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Head</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {transactions.map((transaction, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {transaction.accHeadName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                ₹{transaction.amount?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {transaction.narration || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {transaction.transactionId || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {transaction.billNo || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {transaction.voucherNo || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-gray-500">No recent transactions for this folio.</div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default TransactionForm;