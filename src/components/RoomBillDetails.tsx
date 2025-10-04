import React, { useState, useEffect } from 'react';
import { CheckIn, Advance, Expense, Transaction } from '../types/api';
import { checkInApi, advanceApi, transactionApi } from '../services/api';

interface RoomBillDetailsProps {
  roomId: string;
  roomNo: string;
  onClose: () => void;
}

interface BillSummary {
  roomCharges: number;
  advances: number;
  transactions: number;
  totalBalance: number;
}

const RoomBillDetails: React.FC<RoomBillDetailsProps> = ({ roomId, roomNo, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkInData, setCheckInData] = useState<CheckIn | null>(null);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [billSummary, setBillSummary] = useState<BillSummary>({
    roomCharges: 0,
    advances: 0,
    transactions: 0,
    totalBalance: 0
  });

  useEffect(() => {
    fetchBillDetails();
  }, [roomId]);

  const fetchBillDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get check-in data by room ID
      const checkInResponse = await checkInApi.getCheckInByRoom(roomId);
      if (!checkInResponse.data.success || !checkInResponse.data.data) {
        throw new Error('No check-in data found for this room');
      }

      const checkInData = checkInResponse.data.data;
      setCheckInData(checkInData);

      // Only proceed if we have a folio number
      if (!checkInData.folioNo) {
        throw new Error('No folio number found for this room');
      }

      // Fetch advances by folio number
      const advancesResponse = await advanceApi.getAdvancesByFolio(checkInData.folioNo);
      const advancesData = advancesResponse.data.success ? advancesResponse.data.data : [];
      setAdvances(advancesData);

      // Fetch transactions by folio number
      const transactionsResponse = await transactionApi.getTransactionsByFolio(checkInData.folioNo);
      const transactionsData = transactionsResponse.data.success ? transactionsResponse.data.data : [];
      setTransactions(transactionsData);

      // Calculate bill summary
      calculateBillSummary(checkInData, advancesData, transactionsData);
    } catch (err: any) {
      console.error('Error fetching bill details:', err);
      setError(err.message || 'Failed to fetch bill details');
    } finally {
      setLoading(false);
    }
  };

  const calculateBillSummary = (
    checkIn: CheckIn,
    advancesData: Advance[],
    transactionsData: Transaction[]
  ) => {
    // Calculate room charges (rate * number of days)
    const arrivalDate = new Date(checkIn.arrivalDate);
    const departureDate = new Date(checkIn.departureDate);
    const timeDiff = departureDate.getTime() - arrivalDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const roomCharges = (checkIn.rate || 0) * (daysDiff > 0 ? daysDiff : 1);

    // Calculate total advances
    const totalAdvances = advancesData.reduce((sum, advance) => sum + (advance.amount || 0), 0);

    // Calculate total transactions
    const totalTransactions = transactionsData.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

    // Calculate total balance (room charges + transactions - advances)
    const totalBalance = roomCharges + totalTransactions - totalAdvances;

    setBillSummary({
      roomCharges,
      advances: totalAdvances,
      transactions: totalTransactions,
      totalBalance
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-700">Loading bill details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Bill Details - Room {roomNo}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-red-500 py-4">{error}</div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Bill Details - Room {roomNo}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {checkInData && (
          <div className="space-y-6">
            {/* Guest Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Guest Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-sm text-gray-600">Guest Name:</span>
                  <p className="font-medium">{checkInData.guestName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Folio Number:</span>
                  <p className="font-medium">{checkInData.folioNo}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Arrival Date:</span>
                  <p className="font-medium">{new Date(checkInData.arrivalDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Departure Date:</span>
                  <p className="font-medium">{new Date(checkInData.departureDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Bill Summary */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Room Charges:</span>
                  <span className="font-medium">₹{billSummary.roomCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Advances:</span>
                  <span className="font-medium text-green-600">-₹{billSummary.advances.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Additional Transactions:</span>
                  <span className="font-medium">₹{billSummary.transactions.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>Total Balance:</span>
                  <span className={billSummary.totalBalance > 0 ? "text-red-600" : "text-green-600"}>
                    ₹{Math.abs(billSummary.totalBalance).toFixed(2)}
                    {billSummary.totalBalance > 0 ? " (Due)" : " (Refund)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Advances */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Advances ({advances.length})</h3>
              {advances.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {advances.map((advance, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {advance.date ? new Date(advance.date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600 font-medium">
                            ₹{advance.amount?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {advance.modeOfPaymentName || advance.modeOfPaymentId || 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {advance.receiptNo || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No advances found for this guest.</p>
              )}
            </div>

            {/* Transactions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Transactions ({transactions.length})</h3>
              {transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Head</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((transaction, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            {transaction.accHeadName || 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                            ₹{transaction.amount?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                            {transaction.narration || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No transactions found for this guest.</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomBillDetails;