import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { roomApi, transactionApi } from '../services/api';
import { Room } from '../types/api';

interface FormState {
    roomId: string;
    accHead: string;
    amount: string;
    narration: string;
}

const initialFormState: FormState = {
    roomId: '',
    accHead: '',
    amount: '',
    narration: '',
};

const TransactionForm: React.FC = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [folioNumber, setFolioNumber] = useState('');
    const [guestName, setGuestName] = useState('');
    const [form, setForm] = useState<FormState>(initialFormState);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await roomApi.getRooms();
                if (res.data.success) setRooms(res.data.data);
            } catch (error) {
                // Optionally handle error
            }
        };
        fetchRooms();
    }, []);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!folioNumber || !guestName || !form.accHead || !form.amount) {
            alert('Please fill all required fields.');
            setLoading(false);
            return;
        }

        try {
            await transactionApi.createInhouseTransaction({
                folioNo: folioNumber,
                guestName,
                accHeadId: form.accHead,
                amount: Number(form.amount),
                narration: form.narration,
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
                            <input
                                type="text"
                                name="accHead"
                                value={form.accHead}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="Select Account Head"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Amount</label>
                            <input
                                type="number"
                                name="amount"
                                value={form.amount}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2"
                            />
                        </div>
                        <div className="md:col-span-2">
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
                    <div className="text-gray-500">No recent transactions for this folio.</div>
                </div>
            </div>
        </Layout>
    );
};

export default TransactionForm;
