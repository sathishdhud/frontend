import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Advance, PaymentMode, Reservation, CheckIn, AccountHead, SettlementType, Transaction } from '../types/api';
import { advanceApi, masterDataApi, reservationApi, checkInApi, transactionApi, billApi } from '../services/api';
import Layout from '../components/Layout/Layout';
import { BillPayment } from '../types/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const Cashier: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'record' | 'edit' | 'view' | 'reprint' | 'expenses' | 'settlement' | 'sales' | 'split'>('record');
  const [loading, setLoading] = useState(false);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const [settlementTypes, setSettlementTypes] = useState<SettlementType[]>([]);
  const [contextOptions, setContextOptions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    receiptNumber: `AUTO-GEN-${Math.floor(Math.random() * 9000 + 1000)}`,
    contextValue: '',
    date: new Date().toISOString().split('T')[0],
    modeOfPaymentId: '',
    amount: 0,
    details: '',
    narration: '',
    guestName: '',
    creditCardCompany: '',
    cardNumber: '',
    onlineCompanyName: '',
  });
  
  // Reprint Bill state
  const [reprintData, setReprintData] = useState({
    billNo: '',
    folioNo: '',
  });
  
  // Expenses Entry state
  const [expensesData, setExpensesData] = useState({
    folioNo: '',
    guestName: '',
    accHeadId: '',
    amount: 0,
    narration: '',
    voucherNo: '',
  });
  
  // Settlement Entry state
  const [settlementData, setSettlementData] = useState({
    folioNo: '',
    guestName: '',
    settlementTypeId: '',
    amount: 0,
    remarks: '',
  });
  
  // Sales Receipts state
  const [salesData, setSalesData] = useState({
    receiptNo: `AUTO-GEN-${Math.floor(Math.random() * 9000 + 1000)}`,
    date: new Date().toISOString().split('T')[0],
    accHeadId: '',
    amount: 0,
    narration: '',
    modeOfPaymentId: '',
  });
  
  // Split Bill state
  const [splitBillData, setSplitBillData] = useState({
    folioNo: '',
    guestName: '',
    originalAmount: 0,
    splitAmount: 0,
    remainingAmount: 0,
  });
  
  // Summary state
  const [summary, setSummary] = useState({
    totalToday: 0,
    transactionCount: 0,
    avgAmount: 0,
    lastWeekTotal: 0,
    chartData: [] as { name: string; amount: number }[],
  });
  
  // Add loading state for summary
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  // Add state for viewing advances
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [advancesLoading, setAdvancesLoading] = useState(false);
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(8);
  
  // Add state for editing advance
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
  const [editForm, setEditForm] = useState({
    receiptNumber: '',
    contextValue: '',
    date: '',
    modeOfPaymentId: '',
    amount: 0,
    details: '',
    narration: '',
    guestName: '',
    creditCardCompany: '',
    cardNumber: '',
    onlineCompanyName: '',
  });
  
  // Add state for auto-fill loading
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  // Add state for debouncing
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  // Add state to track if we've attempted to auto-fill
  const [attemptedAutoFill, setAttemptedAutoFill] = useState(false);
  // Add state for context value error
  const [contextError, setContextError] = useState<string | null>(null);
  // Add notification states
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = '';

  // Function to show notifications
  const showNotification = (message: string, isSuccess: boolean = true) => {
    if (isSuccess) {
      setSuccessMessage(message);
      setErrorMessage('');
    } else {
      setErrorMessage(message);
      setSuccessMessage('');
    }
    
    // Clear notifications after 5 seconds
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 5000);
  };

  useEffect(() => {
    fetchPaymentModes();
    fetchAccountHeads();
    fetchSettlementTypes();
    fetchSummary();
    
    // Cleanup function to clear timeout on unmount
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const fetchPaymentModes = async () => {
    try {
      const response = await masterDataApi.getPaymentModes();
      if (response.data.success) {
        setPaymentModes(response.data.data);
      }
    } catch (error) {
      showNotification('Failed to fetch payment modes. Please try again.', false);
    }
  };

  const fetchAccountHeads = async () => {
    try {
      const response = await masterDataApi.getAccountHeads();
      if (response.data.success) {
        setAccountHeads(response.data.data);
      }
    } catch (error) {
      showNotification('Failed to fetch account heads. Please try again.', false);
    }
  };

  const fetchSettlementTypes = async () => {
    try {
      const response = await masterDataApi.getSettlementTypes();
      if (response.data.success) {
        setSettlementTypes(response.data.data);
      }
    } catch (error) {
      showNotification('Failed to fetch settlement types. Please try again.', false);
    }
  };

  // Fetch summary data for advances
  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      
      // Fetch all reservations and in-house guests
      const [reservationsRes, checkInsRes] = await Promise.all([
        reservationApi.getReservations(),
        checkInApi.getInHouseGuests()
      ]);
      
      let allAdvances: Advance[] = [];
      
      // Get advances for all reservations
      if (reservationsRes.data.success) {
        const reservationAdvances = await Promise.all(
          reservationsRes.data.data.map(async (reservation: Reservation) => {
            try {
              const res = await advanceApi.getAdvancesByReservation(reservation.reservationNo);
              return res.data.success ? res.data.data : [];
            } catch (error) {
              return [];
            }
          })
        );
        allAdvances = allAdvances.concat(...reservationAdvances);
      }
      
      // Get advances for all in-house guests
      if (checkInsRes.data.success) {
        const checkInAdvances = await Promise.all(
          checkInsRes.data.data.map(async (checkIn: CheckIn) => {
            try {
              const res = await advanceApi.getAdvancesByFolio(checkIn.folioNo || '');
              return res.data.success ? res.data.data : [];
            } catch (error) {
              return [];
            }
          })
        );
        allAdvances = allAdvances.concat(...checkInAdvances);
      }
      
      // Calculate summary statistics
      const today = new Date().toISOString().split('T')[0];
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
      
      // Filter advances for today
      const todayAdvances = allAdvances.filter(advance => 
        advance.date && advance.date.split('T')[0] === today
      );
      
      // Filter advances for last week
      const lastWeekAdvances = allAdvances.filter(advance => {
        if (!advance.date) return false;
        const advanceDate = advance.date.split('T')[0];
        return advanceDate >= oneWeekAgoStr && advanceDate <= today;
      });
      
      // Calculate totals
      const totalToday = todayAdvances.reduce((sum, advance) => sum + (advance.amount || 0), 0);
      const transactionCount = todayAdvances.length;
      const avgAmount = transactionCount > 0 ? totalToday / transactionCount : 0;
      const lastWeekTotal = lastWeekAdvances.reduce((sum, advance) => sum + (advance.amount || 0), 0);
      
      // Prepare chart data (last 7 days)
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const dayAdvances = allAdvances.filter(advance => {
          if (!advance.date) return false;
          const advanceDate = new Date(advance.date);
          return advanceDate.toDateString() === date.toDateString();
        });
        
        const dayTotal = dayAdvances.reduce((sum, advance) => sum + (advance.amount || 0), 0);
        chartData.push({ name: dateStr, amount: dayTotal });
      }
      
      setSummary({
        totalToday,
        transactionCount,
        avgAmount,
        lastWeekTotal,
        chartData,
      });
    } catch (error) {
      showNotification('Failed to fetch summary data. Please try again.', false);
      // fallback to zeros
      setSummary({
        totalToday: 0,
        transactionCount: 0,
        avgAmount: 0,
        lastWeekTotal: 0,
        chartData: [],
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch all advances for viewing
  const fetchAdvances = async () => {
    try {
      setAdvancesLoading(true);
      
      // Fetch all reservations and in-house guests
      const [reservationsRes, checkInsRes] = await Promise.all([
        reservationApi.getReservations(),
        checkInApi.getInHouseGuests()
      ]);
      
      let allAdvances: Advance[] = [];
      
      // Get advances for all reservations
      if (reservationsRes.data.success) {
        const reservationAdvances = await Promise.all(
          reservationsRes.data.data.map(async (reservation: Reservation) => {
            try {
              const res = await advanceApi.getAdvancesByReservation(reservation.reservationNo);
              return res.data.success ? res.data.data : [];
            } catch (error) {
              return [];
            }
          })
        );
        allAdvances = allAdvances.concat(...reservationAdvances);
      }
      
      // Get advances for all in-house guests
      if (checkInsRes.data.success) {
        const checkInAdvances = await Promise.all(
          checkInsRes.data.data.map(async (checkIn: CheckIn) => {
            try {
              const res = await advanceApi.getAdvancesByFolio(checkIn.folioNo || '');
              return res.data.success ? res.data.data : [];
            } catch (error) {
              return [];
            }
          })
        );
        allAdvances = allAdvances.concat(...checkInAdvances);
      }
      
      // Sort advances by date (newest first)
      allAdvances.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      setAdvances(allAdvances);
    } catch (error) {
      console.error('Failed to fetch advances:', error);
      setAdvances([]);
    } finally {
      setAdvancesLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
    
    // Auto-fill guest name when context value changes
    if (name === 'contextValue') {
      autoFillGuestName(value);
    }
  };

  const handleReprintInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReprintData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleExpensesInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setExpensesData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSettlementInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setSettlementData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSalesInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setSalesData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSplitBillInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setSplitBillData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  // Function to auto-fill guest name based on context value
  const autoFillGuestName = async (contextValue: string) => {
    // Reset the attempted flag and error when context value is cleared
    if (!contextValue) {
      setFormData(prev => ({ ...prev, guestName: '' }));
      setAttemptedAutoFill(false);
      setContextError(null);
      return;
    }
    
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Set new timer for debouncing
    const timer = setTimeout(async () => {
      setAutoFillLoading(true);
      setAttemptedAutoFill(true);
      setContextError(null);
      
      try {
        // Check if context value has a valid prefix
        if (/^[RFBrfb]/.test(contextValue)) {
          // Determine context type by prefix (case insensitive)
          if (/^F/i.test(contextValue)) {
            // Folio (inhouse) - get advances by folio number to extract guest name
            try {
              const response = await advanceApi.getAdvancesByFolio(contextValue);
              if (response.data.success && response.data.data.length > 0) {
                // Get guest name from the first advance record
                const guestName = response.data.data[0].guestName;
                if (guestName) {
                  setFormData(prev => ({ ...prev, guestName }));
                } else {
                  // If no guest name in advances, fall back to check-in API
                  try {
                    const checkInsRes = await checkInApi.searchCheckIns(contextValue);
                    if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
                      const checkIn = checkInsRes.data.data.find((c: CheckIn) => c.folioNo === contextValue);
                      if (checkIn) {
                        setFormData(prev => ({ ...prev, guestName: checkIn.guestName }));
                      } else {
                        setFormData(prev => ({ ...prev, guestName: '' }));
                        setContextError('Folio not found');
                      }
                    } else {
                      setFormData(prev => ({ ...prev, guestName: '' }));
                      setContextError('Folio not found');
                    }
                  } catch (checkInError) {
                    console.error('Failed to fetch guest name from check-in API:', checkInError);
                    setFormData(prev => ({ ...prev, guestName: '' }));
                    setContextError('Failed to fetch guest information for folio');
                  }
                }
              } else {
                // If no advances found, fall back to check-in API
                try {
                  const checkInsRes = await checkInApi.searchCheckIns(contextValue);
                  if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
                    const checkIn = checkInsRes.data.data.find((c: CheckIn) => c.folioNo === contextValue);
                    if (checkIn) {
                      setFormData(prev => ({ ...prev, guestName: checkIn.guestName }));
                    } else {
                      setFormData(prev => ({ ...prev, guestName: '' }));
                      setContextError('Folio not found');
                    }
                  } else {
                    setFormData(prev => ({ ...prev, guestName: '' }));
                    setContextError('Folio not found');
                  }
                } catch (checkInError) {
                  console.error('Failed to fetch guest name from check-in API:', checkInError);
                  setFormData(prev => ({ ...prev, guestName: '' }));
                  setContextError('Failed to fetch guest information for folio');
                }
              }
            } catch (folioError) {
              console.error('Failed to fetch advances for folio:', folioError);
              setFormData(prev => ({ ...prev, guestName: '' }));
              setContextError('Failed to fetch guest name for folio');
            }
          } else if (/^R/i.test(contextValue)) {
            // Reservation - get advances by reservation number to extract guest name
            try {
              // Remove 'R' prefix if present to match the database format
              const reservationNo = contextValue.trim().replace(/^R/i, '');
              const response = await advanceApi.getAdvancesByReservation(reservationNo);
              if (response.data.success && response.data.data.length > 0) {
                // Get guest name from the first advance record
                const guestName = response.data.data[0].guestName;
                if (guestName) {
                  setFormData(prev => ({ ...prev, guestName }));
                } else {
                  setFormData(prev => ({ ...prev, guestName: '' }));
                  setContextError('Guest name not found for this reservation');
                }
              } else {
                // If no advances found, try to get guest name from reservation API
                try {
                  const reservationResponse = await reservationApi.searchReservations(reservationNo);
                  if (reservationResponse.data.success && reservationResponse.data.data.length > 0) {
                    // Find the exact match for the reservation number
                    const reservation = reservationResponse.data.data.find((r: any) => 
                      r.reservationNo === reservationNo
                    );
                    if (reservation) {
                      setFormData(prev => ({ ...prev, guestName: reservation.guestName }));
                    } else {
                      setFormData(prev => ({ ...prev, guestName: '' }));
                      setContextError('Reservation not found');
                    }
                  } else {
                    setFormData(prev => ({ ...prev, guestName: '' }));
                    setContextError('Reservation not found');
                  }
                } catch (reservationError) {
                  console.error('Failed to fetch guest name from reservation API:', reservationError);
                  setFormData(prev => ({ ...prev, guestName: '' }));
                  setContextError('Failed to fetch guest information for reservation');
                }
              }
            } catch (guestError) {
              console.error('Failed to fetch guest name for reservation:', guestError);
              setFormData(prev => ({ ...prev, guestName: '' }));
              setContextError('Failed to fetch guest name for reservation');
            }
          } else if (/^B/i.test(contextValue)) {
            // Bill - try to get guest name by generating a preview of the bill
            try {
              // Extract the bill number (remove 'B' prefix if present)
              const billNo = contextValue.trim().replace(/^B/i, '');
              
              // We need to find the folio number associated with this bill first
              // Since there's no direct API to get bill details by bill number,
              // we'll need to search through check-ins and their associated bills
              
              // First, get all in-house guests
              const checkInsRes = await checkInApi.getInHouseGuests();
              if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
                // For each check-in, try to generate a bill and see if it matches
                for (const checkIn of checkInsRes.data.data) {
                  if (checkIn.folioNo) {
                    try {
                      // Generate a preview bill for this folio
                      const currentDate = new Date();
                      const currentYear = currentDate.getFullYear();
                      const nextYear = currentYear + 1;
                      const financialYear = `${currentYear.toString().slice(-2)}-${nextYear.toString().slice(-2)}`;
                      
                      const billResponse = await billApi.generateBill(checkIn.folioNo, financialYear);
                      if (billResponse.data.success && billResponse.data.data) {
                        const billData = billResponse.data.data;
                        // Check if this is the bill we're looking for
                        if (billData.billNo && billData.billNo.includes(billNo)) {
                          setFormData(prev => ({ ...prev, guestName: billData.guestName || checkIn.guestName || '' }));
                          return; // Found the bill, exit the loop
                        }
                      }
                    } catch (billGenError) {
                      // Continue to next check-in if bill generation fails for this one
                      continue;
                    }
                  }
                }
                
                // If we get here, we didn't find the bill
                setFormData(prev => ({ ...prev, guestName: '' }));
                setContextError('Bill not found');
              } else {
                setFormData(prev => ({ ...prev, guestName: '' }));
                setContextError('No in-house guests found');
              }
            } catch (billError) {
              console.error('Failed to fetch guest name for bill:', billError);
              setFormData(prev => ({ ...prev, guestName: '' }));
              setContextError('Failed to fetch guest information for bill number');
            }
          }
        } else {
          // No valid prefix
          setFormData(prev => ({ ...prev, guestName: '' }));
          setContextError('Please enter a valid context value (R..., F..., or B...)');
        }
      } catch (error) {
        console.error('Failed to auto-fill guest name:', error);
        setFormData(prev => ({ ...prev, guestName: '' }));
        setContextError('Failed to fetch guest information');
      } finally {
        setAutoFillLoading(false);
      }
    }, 300); // 300ms debounce delay
    
    setDebounceTimer(timer);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
    
    // Auto-fill guest name when context value changes in edit form
    if (name === 'contextValue') {
      autoFillGuestNameEdit(value);
    }
  };

  // Function to auto-fill guest name in edit form based on context value
  const autoFillGuestNameEdit = async (contextValue: string) => {
    // Reset the attempted flag and error when context value is cleared
    if (!contextValue) {
      setEditForm(prev => ({ ...prev, guestName: '' }));
      setAttemptedAutoFill(false);
      setContextError(null);
      return;
    }
    
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Set new timer for debouncing
    const timer = setTimeout(async () => {
      setAutoFillLoading(true);
      setAttemptedAutoFill(true);
      setContextError(null);
      
      try {
        // Check if context value has a valid prefix
        if (/^[RFBrfb]/.test(contextValue)) {
          // Determine context type by prefix (case insensitive)
          if (/^F/i.test(contextValue)) {
            // Folio (inhouse) - get advances by folio number to extract guest name
            try {
              const response = await advanceApi.getAdvancesByFolio(contextValue);
              if (response.data.success && response.data.data.length > 0) {
                // Get guest name from the first advance record
                const guestName = response.data.data[0].guestName;
                if (guestName) {
                  setEditForm(prev => ({ ...prev, guestName }));
                } else {
                  // If no guest name in advances, fall back to check-in API
                  try {
                    const checkInsRes = await checkInApi.searchCheckIns(contextValue);
                    if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
                      const checkIn = checkInsRes.data.data.find((c: CheckIn) => c.folioNo === contextValue);
                      if (checkIn) {
                        setEditForm(prev => ({ ...prev, guestName: checkIn.guestName }));
                      } else {
                        setEditForm(prev => ({ ...prev, guestName: '' }));
                        setContextError('Folio not found');
                      }
                    } else {
                      setEditForm(prev => ({ ...prev, guestName: '' }));
                      setContextError('Folio not found');
                    }
                  } catch (checkInError) {
                    console.error('Failed to fetch guest name from check-in API:', checkInError);
                    setEditForm(prev => ({ ...prev, guestName: '' }));
                    setContextError('Failed to fetch guest information for folio');
                  }
                }
              } else {
                // If no advances found, fall back to check-in API
                try {
                  const checkInsRes = await checkInApi.searchCheckIns(contextValue);
                  if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
                    const checkIn = checkInsRes.data.data.find((c: CheckIn) => c.folioNo === contextValue);
                    if (checkIn) {
                      setEditForm(prev => ({ ...prev, guestName: checkIn.guestName }));
                    } else {
                      setEditForm(prev => ({ ...prev, guestName: '' }));
                      setContextError('Folio not found');
                    }
                  } else {
                    setEditForm(prev => ({ ...prev, guestName: '' }));
                    setContextError('Folio not found');
                  }
                } catch (checkInError) {
                  console.error('Failed to fetch guest name from check-in API:', checkInError);
                  setEditForm(prev => ({ ...prev, guestName: '' }));
                  setContextError('Failed to fetch guest information for folio');
                }
              }
            } catch (folioError) {
              console.error('Failed to fetch advances for folio:', folioError);
              setEditForm(prev => ({ ...prev, guestName: '' }));
              setContextError('Failed to fetch guest name for folio');
            }
          }
          else if (/^R/i.test(contextValue)) {
            // Reservation - get advances by reservation number to extract guest name
            try {
              // Remove 'R' prefix if present to match the database format
              const reservationNo = contextValue.trim().replace(/^R/i, '');
              const response = await advanceApi.getAdvancesByReservation(reservationNo);
              if (response.data.success && response.data.data.length > 0) {
                // Get guest name from the first advance record
                const guestName = response.data.data[0].guestName;
                if (guestName) {
                  setEditForm(prev => ({ ...prev, guestName }));
                } else {
                  setEditForm(prev => ({ ...prev, guestName: '' }));
                  setContextError('Guest name not found for this reservation');
                }
              } else {
                // If no advances found, try to get guest name from reservation API
                try {
                  const reservationResponse = await reservationApi.searchReservations(reservationNo);
                  if (reservationResponse.data.success && reservationResponse.data.data.length > 0) {
                    // Find the exact match for the reservation number
                    const reservation = reservationResponse.data.data.find((r: any) => 
                      r.reservationNo === reservationNo
                    );
                    if (reservation) {
                      setEditForm(prev => ({ ...prev, guestName: reservation.guestName }));
                    } else {
                      setEditForm(prev => ({ ...prev, guestName: '' }));
                      setContextError('Reservation not found');
                    }
                  } else {
                    setEditForm(prev => ({ ...prev, guestName: '' }));
                    setContextError('Reservation not found');
                  }
                } catch (reservationError) {
                  console.error('Failed to fetch guest name from reservation API:', reservationError);
                  setEditForm(prev => ({ ...prev, guestName: '' }));
                  setContextError('Failed to fetch guest information for reservation');
                }
              }
            } catch (guestError) {
              console.error('Failed to fetch guest name for reservation (edit):', guestError);
              setEditForm(prev => ({ ...prev, guestName: '' }));
              setContextError('Failed to fetch guest name for reservation');
            }
          } else if (/^B/i.test(contextValue)) {
            // Bill - try to get guest name by generating a preview of the bill
            try {
              // Extract the bill number (remove 'B' prefix if present)
              const billNo = contextValue.trim().replace(/^B/i, '');
              
              // We need to find the folio number associated with this bill first
              // Since there's no direct API to get bill details by bill number,
              // we'll need to search through check-ins and their associated bills
              
              // First, get all in-house guests
              const checkInsRes = await checkInApi.getInHouseGuests();
              if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
                // For each check-in, try to generate a bill and see if it matches
                for (const checkIn of checkInsRes.data.data) {
                  if (checkIn.folioNo) {
                    try {
                      // Generate a preview bill for this folio
                      const currentDate = new Date();
                      const currentYear = currentDate.getFullYear();
                      const nextYear = currentYear + 1;
                      const financialYear = `${currentYear.toString().slice(-2)}-${nextYear.toString().slice(-2)}`;
                      
                      const billResponse = await billApi.generateBill(checkIn.folioNo, financialYear);
                      if (billResponse.data.success && billResponse.data.data) {
                        const billData = billResponse.data.data;
                        // Check if this is the bill we're looking for
                        if (billData.billNo && billData.billNo.includes(billNo)) {
                          setEditForm(prev => ({ ...prev, guestName: billData.guestName || checkIn.guestName || '' }));
                          return; // Found the bill, exit the loop
                        }
                      }
                    } catch (billGenError) {
                      // Continue to next check-in if bill generation fails for this one
                      continue;
                    }
                  }
                }
                
                // If we get here, we didn't find the bill
                setEditForm(prev => ({ ...prev, guestName: '' }));
                setContextError('Bill not found');
              } else {
                setEditForm(prev => ({ ...prev, guestName: '' }));
                setContextError('No in-house guests found');
              }
            } catch (billError) {
              console.error('Failed to fetch guest name for bill (edit):', billError);
              setEditForm(prev => ({ ...prev, guestName: '' }));
              setContextError('Failed to fetch guest information for bill number');
            }
          }
        } else {
          // No valid prefix
          setEditForm(prev => ({ ...prev, guestName: '' }));
          setContextError('Please enter a valid context value (R..., F..., or B...)');
        }
      } catch (error) {
        console.error('Failed to auto-fill guest name (edit):', error);
        setEditForm(prev => ({ ...prev, guestName: '' }));
        setContextError('Failed to fetch guest information');
      } finally {
        setAutoFillLoading(false);
      }
    }, 300); // 300ms debounce delay
    
    setDebounceTimer(timer);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate required fields
      if (!formData.contextValue || !formData.modeOfPaymentId || !formData.amount) {
        showNotification('Please fill all required fields.', false);
        setLoading(false);
        return;
      }
      
      // Determine context type by prefix (simple logic, can be improved)
      let response;
      const advanceData = {
        guestName: formData.guestName,
        modeOfPaymentId: formData.modeOfPaymentId,
        amount: formData.amount,
        remarks: formData.details,
        narration: formData.narration,
        creditCardCompany: formData.creditCardCompany,
        cardNumber: formData.cardNumber,
        onlineCompanyName: formData.onlineCompanyName,
      };
      
      if (/^F/i.test(formData.contextValue)) {
        // Folio (inhouse)
        response = await advanceApi.createAdvanceForInHouse({
          ...advanceData,
          folioNo: formData.contextValue,
        });
      } else if (/^B/i.test(formData.contextValue)) {
        // Bill
        showNotification('Bill advances not implemented in API.', false);
        setLoading(false);
        return;
      } else {
        // Reservation
        response = await advanceApi.createAdvanceForReservation({
          ...advanceData,
          reservationNo: formData.contextValue,
        });
      }
      
      if (response?.data?.success) {
        showNotification('Advance recorded successfully!');
        handleClearForm();
        fetchSummary(); // Refresh summary after saving
      }
    } catch (error: any) {
      showNotification(`Error: ${error.response?.data?.message || 'Failed to record advance'}`, false);
    } finally {
      setLoading(false);
    }
  };

  // Handle editing an advance
  const handleEditAdvance = (advance: Advance) => {
    setEditingAdvance(advance);
    setActiveTab('edit');
    
    // Set the edit form with advance data
    setEditForm({
      receiptNumber: advance.receiptNo || '',
      contextValue: advance.reservationNo || advance.folioNo || advance.billNo || '',
      date: advance.date ? advance.date.split('T')[0] : '',
      modeOfPaymentId: advance.modeOfPaymentId || '',
      amount: advance.amount || 0,
      details: advance.remarks || '',
      narration: advance.narration || '',
      guestName: advance.guestName || '',
      creditCardCompany: advance.creditCardCompany || '',
      cardNumber: advance.cardNumber || '',
      onlineCompanyName: advance.onlineCompanyName || '',
    });
  };

  // Handle updating an advance
  const handleUpdateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdvance) return;
    
    setLoading(true);
    try {
      showNotification('Editing functionality is not fully implemented in the backend API. In a real implementation, this would update the advance.', false);
      
      // After successful update, refresh the view
      setActiveTab('view');
      setEditingAdvance(null);
      fetchAdvances();
      fetchSummary();
    } catch (error: any) {
      showNotification(`Error: ${error.response?.data?.message || 'Failed to update advance'}`, false);
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting an advance
  const handleDeleteAdvance = async (advanceId: string) => {
    if (!window.confirm('Are you sure you want to delete this advance?')) {
      return;
    }
    
    try {
      showNotification('Delete functionality is not implemented in the backend API. In a real implementation, this would delete the advance.', false);
      
      // After successful delete, refresh the view
      fetchAdvances();
      fetchSummary();
    } catch (error: any) {
      showNotification(`Error: ${error.response?.data?.message || 'Failed to delete advance'}`, false);
    }
  };

  const handleClearForm = () => {
    setFormData({
      receiptNumber: `AUTO-GEN-${Math.floor(Math.random() * 9000 + 1000)}`,
      contextValue: '',
      date: new Date().toISOString().split('T')[0],
      modeOfPaymentId: '',
      amount: 0,
      details: '',
      narration: '',
      guestName: '',
      creditCardCompany: '',
      cardNumber: '',
      onlineCompanyName: '',
    });
    setAttemptedAutoFill(false);
    setContextError(null);
  };

  // Handle tab change
  const handleTabChange = (tab: 'record' | 'edit' | 'view' | 'reprint' | 'expenses' | 'settlement' | 'sales' | 'split') => {
    setActiveTab(tab);
    if (tab === 'view') {
      fetchAdvances();
    } else if (tab === 'record') {
      // Reset form when switching to record tab
      handleClearForm();
      setEditingAdvance(null);
      setAttemptedAutoFill(false);
      setContextError(null);
    } else if (tab === 'edit') {
      // Reset edit form when switching to edit tab
      setEditingAdvance(null);
      setAttemptedAutoFill(false);
      setContextError(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Advances Management</h1>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              type="button"
              onClick={() => handleTabChange('record')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === 'record'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Record Advance
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('edit')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === 'edit'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {editingAdvance ? 'Edit Advance' : 'Edit Advance'}
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('view')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === 'view'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              View Advances
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('reprint')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === 'reprint'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Reprint Bill
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('expenses')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === 'expenses'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Expenses Entry
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('settlement')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === 'settlement'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Settlement Entry
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('sales')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === 'sales'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sales Receipts
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('split')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === 'split'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Split Bill
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
            {activeTab === 'record' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Record New Advance</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Receipt Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Receipt Number
                      </label>
                      <input
                        type="text"
                        name="receiptNumber"
                        value={formData.receiptNumber}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>
                    {/* Context Dropdown (single field) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Folio / Bill / Reservation *
                      </label>
                      <input
                        type="text"
                        name="contextValue"
                        value={formData.contextValue}
                        onChange={handleInputChange}
                        placeholder="e.g., R12345, F67890, or B54321"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">Prefix: R (Reservation), F (Folio), B (Bill)</p>
                    </div>
                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Guest Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guest Name
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="guestName"
                          value={formData.guestName}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        {autoFillLoading && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                          </div>
                        )}
                      </div>
                      {!autoFillLoading && attemptedAutoFill && contextError && (
                        <p className="mt-1 text-xs text-red-500">
                          {contextError}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <option value="">Select mode</option>
                        {paymentModes.map(mode => (
                          <option key={mode.id} value={mode.id}>
                            {mode.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount *
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Details */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Details
                      </label>
                      <textarea
                        name="details"
                        value={formData.details}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Narration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Narration
                      </label>
                      <textarea
                        name="narration"
                        value={formData.narration}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Credit Card Company */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Credit Card Company
                      </label>
                      <input
                        type="text"
                        name="creditCardCompany"
                        value={formData.creditCardCompany}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Card Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Number
                      </label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Online Company Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Online Company Name
                      </label>
                      <input
                        type="text"
                        name="onlineCompanyName"
                        value={formData.onlineCompanyName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      {loading ? 'Processing...' : 'Record Advance'}
                    </button>
                  </div>
                </form>
              </>
            )}
            {activeTab === 'edit' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Edit Advance</h2>
                </div>
                <form onSubmit={handleUpdateAdvance} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Receipt Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Receipt Number
                      </label>
                      <input
                        type="text"
                        name="receiptNumber"
                        value={editForm.receiptNumber}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>
                    {/* Context Dropdown (single field) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Folio / Bill / Reservation *
                      </label>
                      <input
                        type="text"
                        name="contextValue"
                        value={editForm.contextValue}
                        onChange={handleEditInputChange}
                        placeholder="e.g., R12345, F67890, or B54321"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">Prefix: R (Reservation), F (Folio), B (Bill)</p>
                    </div>
                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={editForm.date}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Guest Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guest Name
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="guestName"
                          value={editForm.guestName}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        {autoFillLoading && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                          </div>
                        )}
                      </div>
                      {!autoFillLoading && attemptedAutoFill && contextError && (
                        <p className="mt-1 text-xs text-red-500">
                          {contextError}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mode of Payment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mode of Payment *
                      </label>
                      <select
                        name="modeOfPaymentId"
                        value={editForm.modeOfPaymentId}
                        onChange={handleEditInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select mode</option>
                        {paymentModes.map(mode => (
                          <option key={mode.id} value={mode.id}>
                            {mode.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount *
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={editForm.amount}
                        onChange={handleEditInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Details */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Details
                      </label>
                      <textarea
                        name="details"
                        value={editForm.details}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Narration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Narration
                      </label>
                      <textarea
                        name="narration"
                        value={editForm.narration}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Credit Card Company */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Credit Card Company
                      </label>
                      <input
                        type="text"
                        name="creditCardCompany"
                        value={editForm.creditCardCompany}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Card Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Number
                      </label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={editForm.cardNumber}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Online Company Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Online Company Name
                      </label>
                      <input
                        type="text"
                        name="onlineCompanyName"
                        value={editForm.onlineCompanyName}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      {loading ? 'Processing...' : 'Update Advance'}
                    </button>
                  </div>
                </form>
              </>
            )}
            {activeTab === 'view' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">View Advances</h2>
                </div>
                <div className="p-6">
                  {advancesLoading ? (
                    <div className="flex justify-center items-center h-48">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Receipt No</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Guest Name</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Mode of Payment</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Amount</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {advances.length > 0 ? (
                            advances.map(advance => (
                              <tr key={advance.id} className="border-b border-gray-200">
                                <td className="px-4 py-2 text-sm text-gray-700">{advance.receiptNo}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{advance.date?.split('T')[0]}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{advance.guestName}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{advance.modeOfPaymentId}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{advance.amount}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">
                                  <button
                                    type="button"
                                    onClick={() => handleEditAdvance(advance)}
                                    className="px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAdvance(advance.id)}
                                    className="ml-2 px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="px-4 py-2 text-sm text-gray-700" colSpan={6}>
                                No advances found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
            {activeTab === 'reprint' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Reprint Bill</h2>
                </div>
                <form onSubmit={handleReprintBill} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bill Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bill Number
                      </label>
                      <input
                        type="text"
                        name="billNo"
                        value={reprintData.billNo}
                        onChange={handleReprintInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                    {/* Folio Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Folio Number
                      </label>
                      <input
                        type="text"
                        name="folioNo"
                        value={reprintData.folioNo}
                        onChange={handleReprintInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      {loading ? 'Processing...' : 'Reprint Bill'}
                    </button>
                  </div>
                </form>
              </>
            )}
            {activeTab === 'expenses' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Expenses Entry</h2>
                </div>
                <form onSubmit={handleExpensesEntry} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Folio Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Folio Number
                      </label>
                      <input
                        type="text"
                        name="folioNo"
                        value={expensesData.folioNo}
                        onChange={handleExpensesInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                    {/* Guest Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guest Name
                      </label>
                      <input
                        type="text"
                        name="guestName"
                        value={expensesData.guestName}
                        onChange={handleExpensesInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Account Head */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Head
                      </label>
                      <select
                        name="accHeadId"
                        value={expensesData.accHeadId}
                        onChange={handleExpensesInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select account head</option>
                        {accountHeads.map(head => (
                          <option key={head.id} value={head.id}>
                            {head.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={expensesData.amount}
                        onChange={handleExpensesInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Narration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Narration
                      </label>
                      <textarea
                        name="narration"
                        value={expensesData.narration}
                        onChange={handleExpensesInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {/* Voucher Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voucher Number
                      </label>
                      <input
                        type="text"
                        name="voucherNo"
                        value={expensesData.voucherNo}
                        onChange={handleExpensesInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      {loading ? 'Processing...' : 'Record Expenses'}
                    </button>
                  </div>
                </form>
              </>
            )}
            {activeTab === 'settlement' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Settlement Entry</h2>
                </div>
                <form onSubmit={handleSettlementEntry} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Folio Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Folio Number
                      </label>
                      <input
                        type="text"
                        name="folioNo"
                        value={settlementData.folioNo}
                        onChange={handleSettlementInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                    {/* Guest Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guest Name
                      </label>
                      <input
                        type="text"
                        name="guestName"
                        value={settlementData.guestName}
                        onChange={handleSettlementInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Settlement Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Settlement Type
                      </label>
                      <select
                        name="settlementTypeId"
                        value={settlementData.settlementTypeId}
                        onChange={handleSettlementInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select settlement type</option>
                        {settlementTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={settlementData.amount}
                        onChange={handleSettlementInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Remarks */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remarks
                      </label>
                      <textarea
                        name="remarks"
                        value={settlementData.remarks}
                        onChange={handleSettlementInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      {loading ? 'Processing...' : 'Record Settlement'}
                    </button>
                  </div>
                </form>
              </>
            )}
            {activeTab === 'sales' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Sales Receipts</h2>
                </div>
                <form onSubmit={handleSalesReceipts} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Receipt Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Receipt Number
                      </label>
                      <input
                        type="text"
                        name="receiptNo"
                        value={salesData.receiptNo}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>
                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={salesData.date}
                        onChange={handleSalesInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    {/* Account Head */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Head
                      </label>
                      <select
                        name="accHeadId"
                        value={salesData.accHeadId}
                        onChange={handleSalesInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select account head</option>
                        {accountHeads.map(head => (
                          <option key={head.id} value={head.id}>
                            {head.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={salesData.amount}
                        onChange={handleSalesInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    {/* Narration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Narration
                      </label>
                      <textarea
                        name="narration"
                        value={salesData.narration}
                        onChange={handleSalesInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mode of Payment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mode of Payment
                      </label>
                      <select
                        name="modeOfPaymentId"
                        value={salesData.modeOfPaymentId}
                        onChange={handleSalesInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select mode</option>
                        {paymentModes.map(mode => (
                          <option key={mode.id} value={mode.id}>
                            {mode.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      {loading ? 'Processing...' : 'Record Sales'}
                    </button>
                  </div>
                </form>
              </>
            )}
            {activeTab === 'split' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Split Bill</h2>
                </div>
                <form onSubmit={handleSplitBill} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Folio Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Folio Number
                      </label>
                      <input
                        type="text"
                        name="folioNo"
                        value={splitBillData.folioNo}
                        onChange={handleSplitBillInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                    {/* Guest Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guest Name
                      </label>
                      <input
                        type="text"
                        name="guestName"
                        value={splitBillData.guestName}
                        onChange={handleSplitBillInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Original Amount
                      </label>
                      <input
                        type="number"
                        name="originalAmount"
                        value={splitBillData.originalAmount}
                        onChange={handleSplitBillInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    {/* Split Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Split Amount
                      </label>
                      <input
                        type="number"
                        name="splitAmount"
                        value={splitBillData.splitAmount}
                        onChange={handleSplitBillInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Remaining Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remaining Amount
                      </label>
                      <input
                        type="number"
                        name="remainingAmount"
                        value={splitBillData.remainingAmount}
                        onChange={handleSplitBillInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      {loading ? 'Processing...' : 'Split Bill'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
          {/* Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Summary</h2>
            </div>
            <div className="p-6">
              {summaryLoading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div className="text-gray-700">Total Today</div>
                    <div className="font-medium text-gray-900">${summary.totalToday.toFixed(2)}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-gray-700">Transaction Count</div>
                    <div className="font-medium text-gray-900">{summary.transactionCount}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-gray-700">Average Amount</div>
                    <div className="font-medium text-gray-900">${summary.avgAmount.toFixed(2)}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-gray-700">Last Week Total</div>
                    <div className="font-medium text-gray-900">${summary.lastWeekTotal.toFixed(2)}</div>
                  </div>
                  <div className="mt-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={summary.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="amount" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  {/* Details */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Details
                    </label>
                    <textarea
                      name="details"
                      value={formData.details}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Payment details..."
                    />
                  </div>
                  
                  {/* Conditional Credit Card Fields */}
                  {formData.modeOfPaymentId && paymentModes.some(mode => 
                    mode.id === formData.modeOfPaymentId && 
                    mode.name && 
                    (mode.name.toUpperCase().includes('CARD') || mode.name.toUpperCase().includes('CREDIT') || mode.name.toUpperCase().includes('DEBIT'))
                  ) && (
                    <>
                      {/* Credit Card Company */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Credit Card Company
                        </label>
                        <input
                          type="text"
                          name="creditCardCompany"
                          value={formData.creditCardCompany}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Visa, MasterCard, etc."
                        />
                      </div>
                      
                      {/* Card Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Card Number
                        </label>
                        <input
                          type="text"
                          name="cardNumber"
                          value={formData.cardNumber}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="XXXX-XXXX-XXXX-XXXX"
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Conditional Online Payment Fields */}
                  {formData.modeOfPaymentId && paymentModes.some(mode => 
                    mode.id === formData.modeOfPaymentId && 
                    mode.name && 
                    (mode.name.toUpperCase().includes('ONLINE') || mode.name.toUpperCase().includes('PAYPAL') || mode.name.toUpperCase().includes('STRIPE'))
                  ) && (
                    <>
                      {/* Online Company Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Online Company Name
                        </label>
                        <input
                          type="text"
                          name="onlineCompanyName"
                          value={formData.onlineCompanyName}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="PayPal, Stripe, etc."
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Narration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Narration
                    </label>
                    <textarea
                      name="narration"
                      value={formData.narration}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Additional notes..."
                    />
                  </div>
                  {/* Form Actions */}
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : 'Save Advance'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClearForm}
                      className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span>Clear Form</span>
                    </button>
                  </div>
                </form>
              </>
            )}
            {activeTab === 'edit' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Advance</h2>
                {editingAdvance ? (
                  <form onSubmit={handleUpdateAdvance} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Receipt Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Receipt Number
                        </label>
                        <input
                          type="text"
                          name="receiptNumber"
                          value={editForm.receiptNumber}
                          onChange={handleEditInputChange}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        />
                      </div>
                      {/* Context Dropdown (single field) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reservation / Room / Bill Number *
                        </label>
                        <input
                          type="text"
                          name="contextValue"
                          value={editForm.contextValue}
                          onChange={handleEditInputChange}
                          placeholder="e.g., R12345, F67890, or B54321"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                          disabled
                        />
                        <p className="mt-1 text-xs text-gray-500">Prefix: R (Reservation), F (Folio), B (Bill)</p>
                      </div>
                      {/* Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date *
                        </label>
                        <input
                          type="date"
                          name="date"
                          value={editForm.date}
                          onChange={handleEditInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Guest Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Guest Name
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="guestName"
                            value={editForm.guestName}
                            onChange={handleEditInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                          {autoFillLoading && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                            </div>
                          )}
                        </div>
                        {!autoFillLoading && attemptedAutoFill && contextError && (
                          <p className="mt-1 text-xs text-red-500">
                            {contextError}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Mode of Payment */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Mode of Payment *
                        </label>
                        <select
                          name="modeOfPaymentId"
                          value={editForm.modeOfPaymentId}
                          onChange={handleEditInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select mode</option>
                          {paymentModes.map(mode => (
                            <option key={mode.id} value={mode.id}>
                              {mode.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount *
                        </label>
                        <input
                          type="number"
                          name="amount"
                          value={editForm.amount}
                          onChange={handleEditInputChange}
                          min="0"
                          step="0.01"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    {/* Details */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Details
                      </label>
                      <textarea
                        name="details"
                        value={editForm.details}
                        onChange={handleEditInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Payment details..."
                      />
                    </div>
                    
                    {/* Conditional Credit Card Fields */}
                    {editForm.modeOfPaymentId && paymentModes.some(mode => 
                      mode.id === editForm.modeOfPaymentId && 
                      mode.name && 
                      (mode.name.toUpperCase().includes('CARD') || mode.name.toUpperCase().includes('CREDIT') || mode.name.toUpperCase().includes('DEBIT'))
                    ) && (
                      <>
                        {/* Credit Card Company */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Credit Card Company
                          </label>
                          <input
                            type="text"
                            name="creditCardCompany"
                            value={editForm.creditCardCompany}
                            onChange={handleEditInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Visa, MasterCard, etc."
                          />
                        </div>
                        
                        {/* Card Number */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Card Number
                          </label>
                          <input
                            type="text"
                            name="cardNumber"
                            value={editForm.cardNumber}
                            onChange={handleEditInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="XXXX-XXXX-XXXX-XXXX"
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Conditional Online Payment Fields */}
                    {editForm.modeOfPaymentId && paymentModes.some(mode => 
                      mode.id === editForm.modeOfPaymentId && 
                      mode.name && 
                      (mode.name.toUpperCase().includes('ONLINE') || mode.name.toUpperCase().includes('PAYPAL') || mode.name.toUpperCase().includes('STRIPE'))
                    ) && (
                      <>
                        {/* Online Company Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Online Company Name
                          </label>
                          <input
                            type="text"
                            name="onlineCompanyName"
                            value={editForm.onlineCompanyName}
                            onChange={handleEditInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="PayPal, Stripe, etc."
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Narration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Narration
                      </label>
                      <textarea
                        name="narration"
                        value={editForm.narration}
                        onChange={handleEditInputChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Additional notes..."
                      />
                    </div>
                    {/* Form Actions */}
                    <div className="flex space-x-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Updating...' : 'Update Advance'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('view')}
                        className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span>Cancel</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Select an advance to edit from the View Advances tab.</p>
                    <button
                      onClick={() => setActiveTab('view')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      View Advances
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'view' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">View Advances</h2>
                  <button 
                    onClick={fetchAdvances}
                    className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-sm"
                  >
                    Refresh
                  </button>
                </div>
                {advancesLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-2 text-gray-600">Loading advances...</span>
                  </div>
                ) : advances.length > 0 ? (
                  <>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <div className="overflow-hidden max-h-96">
                        <table className="w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Context</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {/* Calculate pagination */}
                            {(() => {
                              const indexOfLastRecord = currentPage * recordsPerPage;
                              const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
                              const currentRecords = advances.slice(indexOfFirstRecord, indexOfLastRecord);
                              
                              return currentRecords.map((advance) => (
                                <tr key={advance.advanceId} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {advance.receiptNo || 'N/A'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {advance.date ? new Date(advance.date).toLocaleDateString() : 'N/A'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {advance.guestName}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {advance.reservationNo ? `R: ${advance.reservationNo}` : 
                                     advance.folioNo ? `F: ${advance.folioNo}` : 
                                     advance.billNo ? `B: ${advance.billNo}` : 'N/A'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                    ₹{advance.amount?.toFixed(2) || '0.00'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {advance.modeOfPaymentName || advance.modeOfPaymentId || 'N/A'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => handleEditAdvance(advance)}
                                        className="text-indigo-600 hover:text-indigo-900"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => advance.advanceId && handleDeleteAdvance(advance.advanceId)}
                                        className="text-red-600 hover:text-red-900"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Pagination */}
                    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 bg-white">
                      <div className="flex flex-1 justify-between sm:hidden">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => {
                            const totalPages = Math.ceil(advances.length / recordsPerPage);
                            return Math.min(prev + 1, totalPages);
                          })}
                          disabled={currentPage === Math.ceil(advances.length / recordsPerPage)}
                          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{Math.min((currentPage - 1) * recordsPerPage + 1, advances.length)}</span> to{' '}
                            <span className="font-medium">{Math.min(currentPage * recordsPerPage, advances.length)}</span> of{' '}
                            <span className="font-medium">{advances.length}</span> results
                          </p>
                        </div>
                        <div>
                          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                            >
                              <span className="sr-only">Previous</span>
                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                              </svg>
                            </button>
                            
                            {/* Page numbers */}
                            {(() => {
                              const totalPages = Math.ceil(advances.length / recordsPerPage);
                              const pageNumbers = [];
                              const maxVisiblePages = 5;
                              
                              // Calculate the range of page numbers to display
                              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                              let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                              
                              // Adjust if we're near the end
                              if (endPage - startPage + 1 < maxVisiblePages) {
                                startPage = Math.max(1, endPage - maxVisiblePages + 1);
                              }
                              
                              // Add first page and ellipsis if needed
                              if (startPage > 1) {
                                pageNumbers.push(
                                  <button
                                    key={1}
                                    onClick={() => setCurrentPage(1)}
                                    className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                  >
                                    1
                                  </button>
                                );
                                if (startPage > 2) {
                                  pageNumbers.push(
                                    <span key="start-ellipsis" className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                                      ...
                                    </span>
                                  );
                                }
                              }
                              
                              // Add page numbers in the visible range
                              for (let i = startPage; i <= endPage; i++) {
                                pageNumbers.push(
                                  <button
                                    key={i}
                                    onClick={() => setCurrentPage(i)}
                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                      currentPage === i
                                        ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                    }`}
                                    aria-current={currentPage === i ? 'page' : undefined}
                                  >
                                    {i}
                                  </button>
                                );
                              }
                              
                              // Add ellipsis and last page if needed
                              if (endPage < totalPages) {
                                if (endPage < totalPages - 1) {
                                  pageNumbers.push(
                                    <span key="end-ellipsis" className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                                      ...
                                    </span>
                                  );
                                }
                                pageNumbers.push(
                                  <button
                                    key={totalPages}
                                    onClick={() => setCurrentPage(totalPages)}
                                    className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                                  >
                                    {totalPages}
                                  </button>
                                );
                              }
                              
                              return pageNumbers;
                            })()}
                            
                            <button
                              onClick={() => setCurrentPage(prev => {
                                const totalPages = Math.ceil(advances.length / recordsPerPage);
                                return Math.min(prev + 1, totalPages);
                              })}
                              disabled={currentPage === Math.ceil(advances.length / recordsPerPage)}
                              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
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
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No advances found.</p>
                    <button 
                      onClick={fetchAdvances}
                      className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
                    >
                      Refresh
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Summary Sidebar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Summary of Advances</h3>
            </div>
            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="space-y-4">
                {summaryLoading ? (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-600"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading summary...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Advances Today</span>
                      <span className="text-lg font-semibold text-gray-900">Rs. {summary.totalToday.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Number of Transactions</span>
                      <span className="text-lg font-semibold text-gray-900">{summary.transactionCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg. Advance Amount</span>
                      <span className="text-lg font-semibold text-gray-900">Rs. {summary.avgAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last Week Total</span>
                      <span className="text-lg font-semibold text-gray-900">Rs. {summary.lastWeekTotal.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Chart */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Weekly Advances</h4>
                {summaryLoading ? (
                  <div className="h-32 flex items-center justify-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="name" 
                          fontSize={10} 
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis hide />
                        <Tooltip 
                          formatter={(value) => [`Rs. ${value}`, 'Amount']}
                          labelStyle={{ color: '#374151' }}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Bar 
                          dataKey="amount" 
                          fill="url(#colorGradient)" 
                          radius={[2, 2, 0, 0]}
                        />
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" />
                            <stop offset="100%" stopColor="#8B5CF6" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                {summaryLoading ? 'Loading data...' : 'Real-time data synchronization is active.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cashier;