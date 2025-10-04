import React, { useState } from 'react';
import { Transaction, Advance } from '../types/api';
import { transactionApi, advanceApi, billApi } from '../services/api';
import jsPDF from 'jspdf';

interface SplitBillProps {
  billNo?: string;
  onSplitComplete?: () => void;
}

interface SplitItem {
  id: string;
  type: 'transaction' | 'advance';
  description: string;
  amount: number;
  selected: boolean;
}

interface BillData {
  billNo: string;
  guestName: string;
  folioNo: string;
  roomNo?: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalAmount?: number;
}

interface GuestTransactionData {
  bill: any;
  transactions: Transaction[];
}

const SplitBill: React.FC<SplitBillProps> = ({ billNo, onSplitComplete }) => {
  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState<BillData | null>(null);
  const [relatedBills, setRelatedBills] = useState<BillData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
  const [newBillName, setNewBillName] = useState('');
  const [localBillNo, setLocalBillNo] = useState(billNo || '');

  // Removed auto-fetch useEffect - data is now fetched only when user clicks Search button

  const fetchBillData = async (billNo: string) => {
    try {
      setLoading(true);
      
      // Fetch all transactions for this guest using the new endpoint
      const response = await billApi.getTransactionsByGuest(billNo);
      if (!response.data.success) {
        throw new Error('Failed to fetch guest transaction data');
      }
      
      const guestTransactionData: GuestTransactionData = response.data.data;
      
      // Set main bill data
      const billInfo = guestTransactionData.bill;
      setBillData({
        billNo: billInfo.billNo,
        guestName: billInfo.guestName,
        folioNo: billInfo.folioNo,
        roomNo: billInfo.roomNo,
        checkInDate: billInfo.checkInDate,
        checkOutDate: billInfo.checkOutDate,
        totalAmount: billInfo.totalAmount
      });
      
      // For related bills, we'll use the existing API
      const relatedResponse = await billApi.getRelatedBills(billNo);
      if (relatedResponse.data.success) {
        const relatedBillsData = relatedResponse.data.data.map((bill: any) => ({
          billNo: bill.billNo,
          guestName: bill.guestName,
          folioNo: bill.folioNo,
          roomNo: bill.roomNo,
          checkInDate: bill.checkInDate,
          checkOutDate: bill.checkOutDate,
          totalAmount: bill.totalAmount
        }));
        setRelatedBills(relatedBillsData);
      }
      
      // Use the transactions from the new endpoint (all transactions for the guest)
      const allTransactions = guestTransactionData.transactions;
      setTransactions(allTransactions);
      
      // Fetch advances for the main bill's folio
      const advanceResponse = await advanceApi.getAdvancesByFolio(billInfo.folioNo);
      const allAdvances = advanceResponse.data.success ? advanceResponse.data.data : [];
      setAdvances(allAdvances);
      
      // Initialize split items with all transactions
      const transactionItems: SplitItem[] = allTransactions.map((transaction: Transaction) => ({
        id: `transaction-${transaction.transactionId}`,
        type: 'transaction',
        description: `${transaction.accHeadName || transaction.accHeadId} - ${transaction.narration || ''}`,
        amount: transaction.amount,
        selected: false
      }));
      
      // Add advances to split items
      const advanceItems: SplitItem[] = allAdvances.map((advance: Advance) => ({
        id: `advance-${advance.advanceId}`,
        type: 'advance',
        description: `Advance - ${advance.modeOfPaymentName || advance.modeOfPaymentId}`,
        amount: advance.amount,
        selected: false
      }));
      
      setSplitItems([...transactionItems, ...advanceItems]);
    } catch (error) {
      console.error('Failed to fetch bill data:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to fetch bill data'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBillSearch = () => {
    if (localBillNo.trim()) {
      fetchBillData(localBillNo.trim());
    }
  };

  const handleItemToggle = (id: string) => {
    setSplitItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleSelectAll = () => {
    setSplitItems(prev => 
      prev.map(item => ({ ...item, selected: true }))
    );
  };

  const handleDeselectAll = () => {
    setSplitItems(prev => 
      prev.map(item => ({ ...item, selected: false }))
    );
  };

  const handleSplitBill = async () => {
    if (!newBillName.trim()) {
      alert('Please enter a name for the new bill');
      return;
    }
    
    const selectedItems = splitItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      alert('Please select at least one item to split');
      return;
    }
    
    try {
      setLoading(true);
      
      // In a real implementation, this would create a new bill with the selected items
      // For now, we'll generate a PDF of the split bill
      generateSplitBillPDF(selectedItems, newBillName);
      
      // Show success notification
      alert(`Split bill "${newBillName}" created successfully with ${selectedItems.length} items. PDF download started.`);
      
      // Reset form
      setNewBillName('');
      handleDeselectAll();
      
      if (onSplitComplete) {
        onSplitComplete();
      }
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message || error.message || 'Failed to split bill'}`);
    } finally {
      setLoading(false);
    }
  };

  const generateSplitBillPDF = (selectedItems: SplitItem[], billName: string) => {
    try {
      // Create a new jsPDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let currentY = margin;
      
      // Add hotel header
      pdf.setFontSize(22);
      pdf.setTextColor(40, 40, 40);
      pdf.setFont('helvetica', 'bold');
      pdf.text('HOTEL STAR', pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;
      
      pdf.setFontSize(16);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Split Bill', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;
      
      // Add bill information
      if (billData) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        pdf.text(`Guest: ${billData.guestName}`, margin, currentY);
        currentY += 7;
        pdf.text(`Original Bill: ${billData.billNo}`, margin, currentY);
        currentY += 7;
        pdf.text(`New Bill Name: ${billName}`, margin, currentY);
        currentY += 7;
        pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin, currentY);
        currentY += 15;
      }
      
      // Add items table
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(40, 40, 40);
      pdf.text('Split Items', margin, currentY);
      currentY += 10;
      
      // Table headers
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Type', margin + 2, currentY + 5);
      pdf.text('Description', margin + 30, currentY + 5);
      pdf.text('Amount (₹)', pageWidth - margin - 25, currentY + 5, { align: 'right' });
      currentY += 8;
      
      // Table content
      pdf.setFont('helvetica', 'normal');
      let totalAmount = 0;
      
      selectedItems.forEach((item, index) => {
        // Alternate row colors
        if (index % 2 === 0) {
          pdf.setFillColor(248, 248, 248);
          pdf.rect(margin, currentY, pageWidth - 2 * margin, 8, 'F');
        }
        
        pdf.text(item.type === 'transaction' ? 'Charge' : 'Advance', margin + 2, currentY + 5);
        pdf.text(item.description, margin + 30, currentY + 5);
        pdf.text(`₹${item.amount.toFixed(2)}`, pageWidth - margin - 25, currentY + 5, { align: 'right' });
        
        totalAmount += item.amount;
        currentY += 8;
        
        // Check if we need a new page
        if (currentY > pageHeight - 50) {
          pdf.addPage();
          currentY = margin;
        }
      });
      
      // Add total
      currentY += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(40, 40, 40);
      pdf.text('Total Amount:', margin, currentY);
      pdf.text(`₹${totalAmount.toFixed(2)}`, pageWidth - margin - 25, currentY, { align: 'right' });
      
      // Save the PDF
      const fileName = `Split_Bill_${billName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const selectedItems = splitItems.filter(item => item.selected);
  const totalSelectedAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Split Bill</h2>
      
      {/* Bill Search Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bill Number *
            </label>
            <input
              type="text"
              value={localBillNo}
              onChange={(e) => setLocalBillNo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter bill number (e.g., B1-25-26)"
            />
          </div>
          <button
            type="button"
            onClick={handleBillSearch}
            disabled={loading || !localBillNo.trim()}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
                  
        <div className="mt-2 text-xs text-gray-500">
          Enter complete bill number (e.g., B1-25-26) and click Search
        </div>
      </div>
      
      {loading && !billData && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Searching for bill...</span>
        </div>
      )}
      
      {billData && (
        <>
          {/* Guest and Bill Information */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Guest Name</p>
                <p className="font-medium">{billData.guestName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Folio Number</p>
                <p className="font-medium">{billData.folioNo}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Room Number</p>
                <p className="font-medium">{billData.roomNo || 'N/A'}</p>
              </div>
            </div>
            <div className="mt-3 text-sm text-blue-700">
              Showing all bills for this guest. Click on any bill to view its items.
            </div>
          </div>
          
          {/* All Guest Bills */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">All Bills for {billData?.guestName}</h3>
            {relatedBills.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {relatedBills.map((bill) => (
                  <div 
                    key={bill.billNo} 
                    className={`p-3 border rounded-lg cursor-pointer ${bill.billNo === localBillNo ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => setLocalBillNo(bill.billNo)}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{bill.billNo}</span>
                      <span className="text-sm text-gray-500">₹{bill.totalAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {bill.checkInDate ? new Date(bill.checkInDate).toLocaleDateString() : 'N/A'} - 
                      {bill.checkOutDate ? new Date(bill.checkOutDate).toLocaleDateString() : 'N/A'}
                    </div>
                    {bill.billNo === localBillNo && (
                      <div className="text-xs text-indigo-600 mt-1">Current Bill</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No other bills found for this guest.
              </div>
            )}
          </div>
          
          {/* New Bill Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Bill Name *
            </label>
            <input
              type="text"
              value={newBillName}
              onChange={(e) => setNewBillName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter name for the new bill (e.g., Restaurant Bill)"
              required
            />
          </div>
          
          {/* Item Selection */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Bill Items</h3>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Deselect All
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Selected Items:</span>
                <span className="text-sm font-medium text-gray-900">{selectedItems.length}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                <span className="text-sm font-medium text-indigo-600">₹{totalSelectedAmount.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {splitItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleItemToggle(item.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.type === 'transaction' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {item.type === 'transaction' ? 'Charge' : 'Advance'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        ₹{item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {splitItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No bill items found.
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleSplitBill}
              disabled={loading || selectedItems.length === 0 || !newBillName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Splitting...' : 'Split Bill'}
            </button>
          </div>
        </>
      )}
      
      {!billData && !loading && (
        <div className="text-center py-8 text-gray-500">
          Enter a bill number above to search for bills and split items.
        </div>
      )}
    </div>
  );
};

export default SplitBill;