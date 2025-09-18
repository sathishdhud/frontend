import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { billApi, masterDataApi } from '../services/api';
import { PaymentMode } from '../types/api';

interface PaymentFormData {
  billNo: string;
  paymentAmount: number;
  modeOfPaymentId: string;
  paymentNotes: string;
}

const PayBillForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  
  const [formData, setFormData] = useState<PaymentFormData>({
    billNo: '',
    paymentAmount: 0,
    modeOfPaymentId: 'CASH',
    paymentNotes: ''
  });

  // Fetch payment modes from API
  useEffect(() => {
    const fetchPaymentModes = async () => {
      try {
        setLoading(true);
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
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentModes();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'paymentAmount' || name === 'billNo' ? value : value
    }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      paymentAmount: parseFloat(value) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.billNo) {
      setError('Please enter a bill number');
      return;
    }
    
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
    setSuccess('');
    
    try {
      // Submit payment to API
      const response = await billApi.addPaymentToBill(formData.billNo, {
        paymentAmount: formData.paymentAmount,
        modeOfPaymentId: formData.modeOfPaymentId,
        paymentNotes: formData.paymentNotes
      });
      
      if (response.data.success) {
        setSuccess('Payment submitted successfully!');
        // Reset form
        setFormData({
          billNo: formData.billNo, // Keep bill number for reference
          paymentAmount: 0,
          modeOfPaymentId: paymentModes.length > 0 ? paymentModes[0].id : 'CASH',
          paymentNotes: ''
        });
      } else {
        throw new Error(response.data.message || 'Failed to submit payment');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to submit payment. Please try again.');
      console.error('Payment submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pay Bill</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Bill Payment</h2>
            <p className="text-sm text-gray-500 mt-1">Enter bill details and payment information</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
                <p className="text-sm">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded">
                <p className="text-sm">{success}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bill Number */}
              <div>
                <label htmlFor="billNo" className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Number *
                </label>
                <input
                  type="text"
                  id="billNo"
                  name="billNo"
                  value={formData.billNo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter bill number"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the bill number for which payment is to be made
                </p>
              </div>
              
              {/* Payment Amount */}
              <div>
                <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  id="paymentAmount"
                  name="paymentAmount"
                  value={formData.paymentAmount}
                  onChange={handleAmountChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the amount to be paid
                </p>
              </div>
              
              {/* Mode of Payment */}
              <div>
                <label htmlFor="modeOfPaymentId" className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  id="modeOfPaymentId"
                  name="modeOfPaymentId"
                  value={formData.modeOfPaymentId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {paymentModes.map(mode => (
                    <option key={mode.id} value={mode.id}>
                      {mode.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Select the method of payment
                </p>
              </div>
              
              {/* Payment Notes */}
              <div className="md:col-span-2">
                <label htmlFor="paymentNotes" className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Notes
                </label>
                <textarea
                  id="paymentNotes"
                  name="paymentNotes"
                  value={formData.paymentNotes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter any additional notes about the payment..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional: Add any special instructions or notes
                </p>
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={submitting || loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : 'Submit Payment'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/generate-bill')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Generate Bill
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default PayBillForm;