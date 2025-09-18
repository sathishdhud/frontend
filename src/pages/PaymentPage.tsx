import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BillPayment, PaymentMode } from '../types/api';
import { billApi, masterDataApi } from '../services/api';
import Layout from '../components/Layout/Layout';

interface PaymentFormData {
  paymentAmount: number;
  modeOfPaymentId: string;
  paymentNotes: string;
}

const PaymentPage: React.FC = () => {
  const { billNo } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [billPayment, setBillPayment] = useState<BillPayment | null>(null);
  
  const [formData, setFormData] = useState<PaymentFormData>({
    paymentAmount: 0,
    modeOfPaymentId: 'CASH',
    paymentNotes: ''
  });

  // Fetch payment modes from API
  useEffect(() => {
    const fetchPaymentModes = async () => {
      try {
        const response = await masterDataApi.getPaymentModes();
        if (response.data.success) {
          setPaymentModes(response.data.data);
          
          // Set default payment mode if there's only one option
          if (response.data.data.length === 1) {
            setFormData(prev => ({
              ...prev,
              modeOfPaymentId: response.data.data[0].id
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch payment modes:', error);
        setError('Failed to load payment options. Please try again.');
      }
    };

    fetchPaymentModes();
  }, []);

  // Fetch bill details if we're editing a payment or if billNo is provided
  useEffect(() => {
    const fetchBillDetails = async () => {
      if (!billNo) return;
      
      try {
        // In a real implementation, you would fetch the bill and any existing payments
        // For now, we'll just initialize the form with empty data
        setBillPayment(null);
        
        // In a real app, you would fetch the bill details and any existing payments
        // const response = await billApi.getBillDetails(billNo);
        // if (response.data.success) {
        //   const billData = response.data.data;
        //   // Set form data based on bill information if needed
        // }
      } catch (error) {
        console.error('Failed to fetch bill details:', error);
        setError('Failed to load bill details. Please try again.');
      }
    };

    fetchBillDetails();
  }, [billNo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.paymentAmount || formData.paymentAmount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }
    
    if (!formData.modeOfPaymentId) {
      setError('Please select a payment mode');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      // Add payment to bill
      const response = await billApi.addPaymentToBill(billNo!, {
        paymentAmount: formData.paymentAmount,
        modeOfPaymentId: formData.modeOfPaymentId,
        paymentNotes: formData.paymentNotes
      });
      
      if (response.data.success) {
        // Show success message and navigate back to bill details
        alert('Payment added successfully!');
        navigate(`/generate-bill?billNo=${billNo}`);
      } else {
        throw new Error('Failed to add payment');
      }
    } catch (error: any) {
      console.error('Failed to process payment:', error);
      setError(error.response?.data?.message || 'Failed to add payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{billPayment ? 'Edit Payment' : 'Add Payment'}</h1>
          <div className="text-sm text-gray-500">
            {billPayment ? 'Modify existing payment details' : 'Add new payment to bill'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {billPayment ? 'Edit Payment Details' : 'New Payment Information'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount *
                  </label>
                  <input
                    type="number"
                    name="paymentAmount"
                    value={formData.paymentAmount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the amount paid by the guest
                  </p>
                </div>
                
                {/* Mode of Payment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mode of Payment *
                  </label>
                  <select
                    name="modeOfPaymentId"
                    value={formData.modeOfPaymentId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select payment mode</option>
                    {paymentModes.map(mode => (
                      <option key={mode.id} value={mode.id}>
                        {mode.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select the method used for payment
                  </p>
                </div>
              </div>
              
              {/* Payment Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Notes
                </label>
                <textarea
                  name="paymentNotes"
                  value={formData.paymentNotes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter any additional notes about the payment..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional: Add any special instructions or notes
                </p>
              </div>
              
              {/* Form Actions */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : billPayment ? 'Update Payment' : 'Add Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
          
          {/* Payment Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Bill Number:</span>
                <span className="font-semibold">{billNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Amount:</span>
                <span className="font-semibold">
                  ₹{formData.paymentAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Mode:</span>
                <span className="font-semibold">
                  {formData.modeOfPaymentId
                    ? paymentModes.find(p => p.id === formData.modeOfPaymentId)?.name || 'Unknown'
                    : 'Not selected'}
                </span>
              </div>
              {formData.paymentNotes && (
                <div className="pt-2">
                  <span className="text-gray-600">Payment Notes:</span>
                  <p className="text-sm text-gray-900 mt-1">{formData.paymentNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentPage;