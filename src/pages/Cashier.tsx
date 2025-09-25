import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Advance, PaymentMode, Reservation, CheckIn, AccountHead, SettlementType, Transaction, Room } from '../types/api';
import { advanceApi, masterDataApi, reservationApi, checkInApi, transactionApi, billApi, roomApi } from '../services/api';
import Layout from '../components/Layout/Layout';
import { BillPayment } from '../types/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import Modal from '../components/Modal';

const Cashier = () => {
  const [activeTab, setActiveTab] = useState<'record' | 'edit' | 'view' | 'reprint' | 'expenses' | 'settlement' | 'sales' | 'split'>('record');
  const [recordSubTab, setRecordSubTab] = useState<'reservation' | 'bill' | 'room'>('reservation');
  const [loading, setLoading] = useState(false);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const [settlementTypes, setSettlementTypes] = useState<SettlementType[]>([]);
  const [contextOptions, setContextOptions] = useState<any[]>([]);
  
  // Form state for different record types
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
    roomNo: '', // Added for room advances
  });
  
  // State for room advance information
  const [roomAdvanceInfo, setRoomAdvanceInfo] = useState({
    folioNo: '',
    guestName: ''
  });
  
  // State for bill information
  const [billInfo, setBillInfo] = useState({
    folioNo: '',
    guestName: ''
  });
  
  // Reprint Bill state
  const [reprintData, setReprintData] = useState({
    billNo: '',
  });
  
  // Expenses Entry state
  const [expensesData, setExpensesData] = useState({
    folioNo: '',
    guestName: '',
    accHeadId: '',
    amount: 0,
    narration: '',
    voucherNo: '',
    includingGst: 'N' as 'Y' | 'N',
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
    voucherNo: '',
    shiftNo: '1',
    shiftDate: new Date().toISOString().split('T')[0],
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

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [modalAction, setModalAction] = useState<(() => void) | null>(null);
  const [showConfirmButton, setShowConfirmButton] = useState(true);
  const [showCancelButton, setShowCancelButton] = useState(true);
  const [confirmText, setConfirmText] = useState('Confirm');
  const [cancelText, setCancelText] = useState('Cancel');

  // Function to show notifications
  const showNotification = (message: string, isSuccess: boolean = true) => {
    if (isSuccess) {
      setModalTitle("Success");
      setModalMessage(message);
      setModalType('success');
    } else {
      setModalTitle("Error");
      setModalMessage(message);
      setModalType('error');
    }
    
    setModalOpen(true);
    
    // Clear modal after 5 seconds
    setTimeout(() => {
      setModalOpen(false);
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
      showNotification('Failed to fetch advances. Please try again.', false);
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
    
    // Auto-fill guest name when room number changes
    if (name === 'roomNo') {
      autoFillGuestNameForRoom(value);
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
    
    // Auto-fill guest name when folio number changes
    if (name === 'folioNo') {
      autoFillGuestNameForExpenses(value);
    }
  };

  // Function to auto-fill guest name for expenses entry based on folio number
  const autoFillGuestNameForExpenses = async (folioNo: string) => {
    if (!folioNo) {
      setExpensesData(prev => ({ ...prev, guestName: '' }));
      return;
    }
    
    try {
      const checkInsRes = await checkInApi.searchCheckIns(folioNo);
      if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
        const checkIn = checkInsRes.data.data.find((c: CheckIn) => c.folioNo === folioNo);
        if (checkIn) {
          setExpensesData(prev => ({ ...prev, guestName: checkIn.guestName }));
        } else {
          setExpensesData(prev => ({ ...prev, guestName: '' }));
        }
      } else {
        setExpensesData(prev => ({ ...prev, guestName: '' }));
      }
    } catch (error) {
      showNotification('Failed to fetch guest name for expenses entry. Please try again.', false);
      setExpensesData(prev => ({ ...prev, guestName: '' }));
    }
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
                  setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
                } else {
                  // If no guest name in advances, fall back to check-in API
                  try {
                    const checkInsRes = await checkInApi.searchCheckIns(contextValue);
                    if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
                      const checkIn = checkInsRes.data.data.find((c: CheckIn) => c.folioNo === contextValue);
                      if (checkIn) {
                        setFormData(prev => ({ ...prev, guestName: checkIn.guestName }));
                        setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
                      } else {
                        setFormData(prev => ({ ...prev, guestName: '' }));
                        setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
                        setContextError('Folio not found');
                      }
                    } else {
                      setFormData(prev => ({ ...prev, guestName: '' }));
                      setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
                      setContextError('Folio not found');
                    }
                  } catch (checkInError) {
                    showNotification('Failed to fetch guest name from check-in API. Please try again.', false);
                    setFormData(prev => ({ ...prev, guestName: '' }));
                    setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
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
                      setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
                    } else {
                      setFormData(prev => ({ ...prev, guestName: '' }));
                      setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
                      setContextError('Folio not found');
                    }
                  } else {
                    setFormData(prev => ({ ...prev, guestName: '' }));
                    setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
                    setContextError('Folio not found');
                  }
                } catch (checkInError) {
                  showNotification('Failed to fetch guest name from check-in API. Please try again.', false);
                  setFormData(prev => ({ ...prev, guestName: '' }));
                  setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
                  setContextError('Failed to fetch guest information for folio');
                }
              }
            } catch (folioError) {
              showNotification('Failed to fetch advances for folio. Please try again.', false);
              setFormData(prev => ({ ...prev, guestName: '' }));
              setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
              setContextError('Failed to fetch guest name for folio');
            }
          } else if (/^R/i.test(contextValue)) {
            // Reservation - get advances by reservation number to extract guest name
            try {
              // Remove 'R' prefix if present to match the database format
              const reservationNo = contextValue.trim().replace(/^R/i, '');
              
              // First try to get guest name from reservation API
              try {
                const reservationResponse = await reservationApi.searchReservations(reservationNo);
                if (reservationResponse.data.success && reservationResponse.data.data.length > 0) {
                  // Find the exact match for the reservation number
                  const reservation = reservationResponse.data.data.find((r: any) => 
                    r.reservationNo === reservationNo
                  );
                  if (reservation) {
                    setFormData(prev => ({ ...prev, guestName: reservation.guestName }));
                    setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
                    return; // Successfully found reservation
                  }
                }
              } catch (reservationError) {
                // Continue to advances API if reservation API fails
              }
              
              // If reservation API fails, try to get guest name from advances API
              const response = await advanceApi.getAdvancesByReservation(reservationNo);
              if (response.data.success && response.data.data.length > 0) {
                // Get guest name from the first advance record
                const guestName = response.data.data[0].guestName;
                if (guestName) {
                  setFormData(prev => ({ ...prev, guestName }));
                  setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
                } else {
                  setFormData(prev => ({ ...prev, guestName: '' }));
                  setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
                  setContextError('Guest name not found for this reservation');
                }
              } else {
                setFormData(prev => ({ ...prev, guestName: '' }));
                setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
                setContextError('Reservation not found');
              }
            } catch (guestError) {
              showNotification('Failed to fetch guest name for reservation. Please try again.', false);
              setFormData(prev => ({ ...prev, guestName: '' }));
              setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
              setContextError('Failed to fetch guest name for reservation');
            }
          } else if (/^B/i.test(contextValue)) {
            // Bill - try to get guest name and folio number by generating a preview of the bill
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
                          const guestName = billData.guestName || checkIn.guestName || '';
                          const folioNo = checkIn.folioNo;
                          setFormData(prev => ({ ...prev, guestName }));
                          setBillInfo({ folioNo, guestName });
                          return; // Found the bill, exit the loop
                        }
                      }
                    } catch (billError) {
                      // Continue to next check-in if bill generation fails
                    }
                  }
                }
              }
              // If no matching bill found, clear guest name and bill info
              setFormData(prev => ({ ...prev, guestName: '' }));
              setBillInfo({ folioNo: '', guestName: '' });
              setContextError('Bill not found');
            } catch (error) {
              showNotification('Failed to fetch guest name for bill. Please try again.', false);
              setFormData(prev => ({ ...prev, guestName: '' }));
              setBillInfo({ folioNo: '', guestName: '' });
              setContextError('Failed to fetch guest name for bill');
            }
          }
        } else {
          // No valid prefix
          setFormData(prev => ({ ...prev, guestName: '' }));
          setContextError('Please enter a valid context value (R..., F..., or B...)');
        }
      } catch (error) {
        showNotification('Failed to auto-fill guest name. Please try again.', false);
        setFormData(prev => ({ ...prev, guestName: '' }));
        setContextError('Failed to fetch guest information');
      } finally {
        setAutoFillLoading(false);
      }
    }, 300); // 300ms debounce delay
    
    setDebounceTimer(timer);
  };

  // Function to auto-fill guest name and folio number for room advance based on room number
  const autoFillGuestNameForRoom = async (roomNo: string) => {
    if (!roomNo) {
      setFormData(prev => ({ ...prev, guestName: '' }));
      setRoomAdvanceInfo({ folioNo: '', guestName: '' });
      return;
    }
    
    try {
      // First, get the room ID by room number (for validation and guest lookup)
      const roomsRes = await roomApi.getRooms();
      if (roomsRes.data.success) {
        const room = roomsRes.data.data.find((r: Room) => r.roomNo === roomNo);
        if (room) {
          // Now get the guest name and folio number by room ID
          const checkInRes = await checkInApi.getCheckInByRoom(room.roomId);
          if (checkInRes.data.success && checkInRes.data.data) {
            const guestName = checkInRes.data.data.guestName;
            const folioNo = checkInRes.data.data.folioNo;
            setFormData(prev => ({ ...prev, guestName }));
            setRoomAdvanceInfo({ folioNo, guestName });
          } else {
            setFormData(prev => ({ ...prev, guestName: '' }));
            setRoomAdvanceInfo({ folioNo: '', guestName: '' });
          }
        } else {
          setFormData(prev => ({ ...prev, guestName: '' }));
          setRoomAdvanceInfo({ folioNo: '', guestName: '' });
          // Only show notification if room number is provided but not found
          if (roomNo.trim() !== '') {
            showNotification(`Room ${roomNo} not found.`, false);
          }
        }
      } else {
        showNotification('Failed to fetch room information.', false);
      }
    } catch (error) {
      showNotification('Failed to fetch guest name for room advance. Please try again.', false);
      setFormData(prev => ({ ...prev, guestName: '' }));
      setRoomAdvanceInfo({ folioNo: '', guestName: '' });
    }
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
                      }
                    } else {
                      setEditForm(prev => ({ ...prev, guestName: '' }));
                    }
                  } catch (checkInError) {
                    showNotification('Failed to fetch guest name from check-in API. Please try again.', false);
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
                    }
                  } else {
                    setEditForm(prev => ({ ...prev, guestName: '' }));
                  }
                } catch (checkInError) {
                  showNotification('Failed to fetch guest name from check-in API. Please try again.', false);
                  setEditForm(prev => ({ ...prev, guestName: '' }));
                  setContextError('Failed to fetch guest information for folio');
                }
              }
            } catch (folioError) {
              showNotification('Failed to fetch advances for folio. Please try again.', false);
              setEditForm(prev => ({ ...prev, guestName: '' }));
              setContextError('Failed to fetch guest name for folio');
            }
          } else if (/^R/i.test(contextValue)) {
            // Reservation - get advances by reservation number to extract guest name
            try {
              // Remove 'R' prefix if present to match the database format
              const reservationNo = contextValue.trim().replace(/^R/i, '');
              
              // First try to get guest name from reservation API
              try {
                const reservationResponse = await reservationApi.searchReservations(reservationNo);
                if (reservationResponse.data.success && reservationResponse.data.data.length > 0) {
                  // Find the exact match for the reservation number
                  const reservation = reservationResponse.data.data.find((r: any) => 
                    r.reservationNo === reservationNo
                  );
                  if (reservation) {
                    setEditForm(prev => ({ ...prev, guestName: reservation.guestName }));
                    return; // Successfully found reservation
                  }
                }
              } catch (reservationError) {
                // Continue to advances API if reservation API fails
              }
              
              // If reservation API fails, try to get guest name from advances API
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
                setEditForm(prev => ({ ...prev, guestName: '' }));
                setContextError('Reservation not found');
              }
            } catch (guestError) {
              showNotification('Failed to fetch guest name for reservation. Please try again.', false);
              setEditForm(prev => ({ ...prev, guestName: '' }));
              setContextError('Failed to fetch guest name for reservation');
            }
          } else if (/^B/i.test(contextValue)) {
            // Bill - try to get guest name and folio number by generating a preview of the bill
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
                    } catch (billError) {
                      // Continue to next check-in if bill generation fails
                    }
                  }
                }
              }
              // If no matching bill found, clear guest name and bill info
              setEditForm(prev => ({ ...prev, guestName: '' }));
              setContextError('Bill not found');
            } catch (error) {
              showNotification('Failed to fetch guest name for bill. Please try again.', false);
              setEditForm(prev => ({ ...prev, guestName: '' }));
              setContextError('Failed to fetch guest name for bill');
            }
          }
        } else {
          // No valid prefix
          setEditForm(prev => ({ ...prev, guestName: '' }));
          setContextError('Please enter a valid context value (R..., F..., or B...)');
        }
      } catch (error) {
        showNotification('Failed to auto-fill guest name. Please try again.', false);
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
      // Validate required fields based on sub-tab
      if (recordSubTab === 'room') {
        if (!formData.roomNo || !formData.modeOfPaymentId || !formData.amount) {
          showNotification('Please fill all required fields.', false);
          setLoading(false);
          return;
        }
      } else {
        if (!formData.contextValue || !formData.modeOfPaymentId || !formData.amount) {
          showNotification('Please fill all required fields.', false);
          setLoading(false);
          return;
        }
      }
      
      // Determine context type by sub-tab
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
      
      if (recordSubTab === 'reservation') {
        // Reservation - add R prefix if not present
        const reservationNo = formData.contextValue.startsWith('R') 
          ? formData.contextValue 
          : `R${formData.contextValue}`;
        
        response = await advanceApi.createAdvanceForReservation({
          ...advanceData,
          reservationNo,
        });
      } else if (recordSubTab === 'bill') {
        // Bill - add B prefix if not present
        const billNo = formData.contextValue.startsWith('B') 
          ? formData.contextValue 
          : `B${formData.contextValue}`;
        
        response = await advanceApi.createAdvanceForBill(billNo, advanceData);
      } else if (recordSubTab === 'room') {
        // Room
        response = await advanceApi.createAdvanceForRoom(formData.roomNo, {
          guestName: formData.guestName,
          modeOfPaymentId: formData.modeOfPaymentId,
          amount: formData.amount,
          narration: formData.narration,
          date: formData.date,
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
    setModalTitle("Confirm Delete");
    setModalMessage("Are you sure you want to delete this advance?");
    setModalType('warning');
    setConfirmText("Delete");
    setCancelText("Cancel");
    setShowConfirmButton(true);
    setShowCancelButton(true);
    
    // Set the action to perform when confirmed
    setModalAction(() => async () => {
      try {
        showNotification('Delete functionality is not implemented in the backend API. In a real implementation, this would delete the advance.', false);
        
        // After successful delete, refresh the view
        fetchAdvances();
        fetchSummary();
      } catch (error: any) {
        showNotification(`Error: ${error.response?.data?.message || 'Failed to delete advance'}`, false);
      }
      setModalOpen(false);
    });
    
    setModalOpen(true);
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
      roomNo: '',
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
      setRecordSubTab('reservation'); // Reset to reservation sub-tab
    } else if (tab === 'edit') {
      // Reset edit form when switching to edit tab
      setEditingAdvance(null);
      setAttemptedAutoFill(false);
      setContextError(null);
    }
  };

  // Handle sub-tab change for record tab
  const handleRecordSubTabChange = (subTab: 'reservation' | 'bill' | 'room') => {
    setRecordSubTab(subTab);
    // Reset form when switching sub-tabs
    handleClearForm();
  };

  // Handle reprint bill
  const handleReprintBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!reprintData.billNo) {
        showNotification('Please enter a bill number.', false);
        setLoading(false);
        return;
      }
      
      // Try to get the bill data by bill number
      try {
        const billResponse = await billApi.getBillByBillNo(reprintData.billNo);
        if (billResponse.data.success && billResponse.data.data) {
          // Successfully retrieved bill data
          const billData = billResponse.data.data;
          
          // Fetch related data to enrich the bill
          let billTransactions: any[] = [];
          let billAdvances: any[] = [];
          
          // Get transactions if available
          if (billData.folioNo) {
            try {
              const transactionsResponse = await transactionApi.getTransactionsByFolio(billData.folioNo);
              if (transactionsResponse.data.success) {
                billTransactions = transactionsResponse.data.data;
              }
            } catch (error) {
              showNotification('Error fetching transactions. Please try again.', false);
            }
          }
          
          // Get advances by bill number
          try {
            const advancesResponse = await advanceApi.getAdvancesByBill(billData.billNo);
            if (advancesResponse.data.success) {
              billAdvances = advancesResponse.data.data;
            }
          } catch (error) {
            showNotification('Error fetching advances by bill. Please try again.', false);
          }
          
          // If no advances found by bill number, try by folio number
          if (billAdvances.length === 0 && billData.folioNo) {
            try {
              const advancesResponse = await advanceApi.getAdvancesByFolio(billData.folioNo);
              if (advancesResponse.data.success) {
                billAdvances = advancesResponse.data.data;
              }
            } catch (error) {
              showNotification('Error fetching advances by folio. Please try again.', false);
            }
          }
          
          // If still no advances, try by reservation number
          if (billAdvances.length === 0 && billData.reservationNo) {
            try {
              const advancesResponse = await advanceApi.getAdvancesByReservation(billData.reservationNo);
              if (advancesResponse.data.success) {
                billAdvances = advancesResponse.data.data;
              }
            } catch (error) {
              showNotification('Error fetching advances by reservation. Please try again.', false);
            }
          }
          
          // Enrich bill data with additional information
          const enrichedBillData = {
            ...billData,
            transactions: billTransactions,
            advances: billAdvances,
            // Calculate additional charges from transactions
            additionalCharges: billTransactions
              .filter((transaction: any) => transaction.accHeadId !== 'ROOM_CHARGES')
              .reduce((sum: number, transaction: any) => sum + (transaction.amount || 0), 0),
            // Calculate advance amount from advances
            advanceAmount: billAdvances.reduce((sum, advance) => sum + (advance.amount || 0), 0),
            // Ensure all date fields are properly formatted
            checkInDate: billData.checkInDate ? new Date(billData.checkInDate).toLocaleDateString() : 'N/A',
            checkOutDate: billData.checkOutDate ? new Date(billData.checkOutDate).toLocaleDateString() : 'N/A',
            generatedAt: billData.generatedAt ? new Date(billData.generatedAt).toLocaleString() : '',
            settlementDate: billData.settlementDate ? new Date(billData.settlementDate).toLocaleString() : 'N/A',
          };
          
          // Generate and print PDF
          generateBillPDF(enrichedBillData);
          
          // Show success message
          showNotification(`Bill ${reprintData.billNo} retrieved and printed successfully.`, true);
          
          // Reset form
          setReprintData({
            billNo: '',
          });
        } else {
          showNotification('Bill not found for the provided bill number.', false);
        }
      } catch (error: any) {
        // If attempt fails, show error
        showNotification(`Error retrieving bill: ${error.response?.data?.message || 'Failed to retrieve bill for reprinting'}`, false);
      }
    } catch (error: any) {
      showNotification(`Error: ${error.response?.data?.message || 'Failed to reprint bill'}`, false);
    } finally {
      setLoading(false);
    }
  };
  
  // Generate and print bill PDF with full details
  const generateBillPDF = (billData: any) => {
    try {
      // Create a new jsPDF instance with A4 dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let currentY = margin; // Starting Y position
      
      // Set font styles
      pdf.setFont('helvetica');
      
      // Add hotel header with modern styling
      pdf.setFontSize(28);
      pdf.setTextColor(40, 40, 40); // Dark gray color
      pdf.setFont('helvetica', 'bold');
      pdf.text('HOTEL STAR', pageWidth / 2, currentY, { align: 'center' });
      currentY += 12;
      
      // Add hotel address
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100); // Medium gray
      pdf.text('123 Hotel Street, City, State 12345', pageWidth / 2, currentY, { align: 'center' });
      currentY += 6;
      pdf.text('Phone: (123) 456-7890 | Email: info@hotelstar.com', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;
      
      // Add decorative separator
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 12;
      
      // Add bill title with modern styling
      pdf.setFontSize(22);
      pdf.setTextColor(40, 40, 40);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BILL INVOICE', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;
      
      // Add date and bill info in a modern card-like format
      pdf.setFontSize(11);
      const today = new Date().toLocaleDateString();
      
      // Bill information card
      const cardX = pageWidth - 90;
      const cardY = currentY;
      const cardWidth = 70;
      const cardHeight = 35;
      
      // Draw card with rounded corners effect
      pdf.setFillColor(245, 245, 245);
      pdf.rect(cardX, cardY, cardWidth, cardHeight, 'F');
      pdf.setDrawColor(220, 220, 220);
      pdf.rect(cardX, cardY, cardWidth, cardHeight);
      
      // Card content
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(60, 60, 60);
      pdf.text('Bill No:', cardX + 5, cardY + 10);
      pdf.text('Date:', cardX + 5, cardY + 20);
      pdf.setFont('helvetica', 'normal');
      pdf.text(billData.billNo || 'N/A', cardX + 25, cardY + 10);
      pdf.text(today, cardX + 25, cardY + 20);
      
      // Guest information in a two-column layout
      const leftColX = margin;
      const rightColX = pageWidth / 2;
      
      currentY += 40;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(60, 60, 60);
      pdf.text('Guest Name:', leftColX, currentY + 10);
      pdf.text('Room No:', leftColX, currentY + 20);
      pdf.text('Check-in:', leftColX, currentY + 30);
      pdf.text('Check-out:', leftColX, currentY + 40);
      
      pdf.text('Folio No:', rightColX - 10, currentY + 10);
      pdf.text('Status:', rightColX - 10, currentY + 20);
      pdf.text('Settlement:', rightColX - 10, currentY + 30);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(40, 40, 40);
      pdf.text(billData.guestName || 'N/A', leftColX + 30, currentY + 10);
      pdf.text(billData.roomNo || 'N/A', leftColX + 30, currentY + 20);
      pdf.text(billData.checkInDate || 'N/A', leftColX + 30, currentY + 30);
      pdf.text(billData.checkOutDate || 'N/A', leftColX + 30, currentY + 40);
      
      pdf.text(billData.folioNo || 'N/A', rightColX + 30, currentY + 10);
      pdf.text(billData.settlementStatus || 'Pending', rightColX + 30, currentY + 20);
      pdf.text(billData.settlementDate || 'N/A', rightColX + 30, currentY + 30);
      
      currentY += 55;
      
      // Add items table header with modern styling
      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Charges Summary', margin, currentY);
      currentY += 12;
      
      // Table with modern styling
      const tableStartX = margin;
      const tableWidth = pageWidth - (margin * 2);
      const rowHeight = 10;
      
      // Table headers with background
      pdf.setFillColor(60, 60, 60);
      pdf.rect(tableStartX, currentY, tableWidth, rowHeight, 'F');
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Description', tableStartX + 5, currentY + 7);
      pdf.text('Amount (₹)', tableStartX + tableWidth - 5, currentY + 7, { align: 'right' });
      
      currentY += rowHeight;
      
      // Table content with alternating row colors
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(40, 40, 40);
      
      // Add room charges
      if (billData.roomCharges > 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(tableStartX, currentY, tableWidth, rowHeight, 'F');
        pdf.text('Room Charges', tableStartX + 5, currentY + 7);
        pdf.text(`₹${billData.roomCharges?.toFixed(2) || '0.00'}`, tableStartX + tableWidth - 5, currentY + 7, { align: 'right' });
        currentY += rowHeight;
      }
      
      // Add additional charges from transactions
      if (billData.transactions && billData.transactions.length > 0) {
        billData.transactions.forEach((transaction: any, index: number) => {
          if (transaction.accHeadId !== 'ROOM_CHARGES' && transaction.amount > 0) {
            const itemName = transaction.accHeadName || transaction.accHeadId || 'Item';
            
            // Alternating row colors
            if (index % 2 === 0) {
              pdf.setFillColor(250, 250, 250);
              pdf.rect(tableStartX, currentY, tableWidth, rowHeight, 'F');
            }
            
            pdf.text(itemName, tableStartX + 5, currentY + 7);
            pdf.text(`₹${transaction.amount?.toFixed(2) || '0.00'}`, tableStartX + tableWidth - 5, currentY + 7, { align: 'right' });
            currentY += rowHeight;
            
            // Check if we need a new page
            if (currentY > pageHeight - 80) {
              pdf.addPage();
              currentY = margin;
            }
          }
        });
      }
      
      // Add separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.line(tableStartX, currentY, tableStartX + tableWidth, currentY);
      currentY += 8;
      
      // Calculate totals
      const roomCharges = billData.roomCharges || 0;
      const additionalCharges = billData.additionalCharges || 0;
      const subtotal = roomCharges + additionalCharges;
      const advanceAmount = billData.advanceAmount || (billData.advances ? billData.advances.reduce((sum: number, advance: any) => sum + (advance.amount || 0), 0) : 0);
      const balanceAmount = Math.max(0, subtotal - advanceAmount);
      const paidAmount = billData.paidAmount || 0;
      
      // Add summary in a card-like format
      const summaryCardX = pageWidth - 100;
      const summaryCardY = currentY;
      const summaryCardWidth = 80;
      const summaryCardHeight = 50;
      
      pdf.setFillColor(245, 245, 245);
      pdf.rect(summaryCardX, summaryCardY, summaryCardWidth, summaryCardHeight, 'F');
      pdf.setDrawColor(220, 220, 220);
      pdf.rect(summaryCardX, summaryCardY, summaryCardWidth, summaryCardHeight);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(60, 60, 60);
      pdf.text('Room Charges:', summaryCardX + 5, summaryCardY + 12);
      pdf.text('Additional Charges:', summaryCardX + 5, summaryCardY + 22);
      pdf.text('Subtotal:', summaryCardX + 5, summaryCardY + 32);
      pdf.text('Advance:', summaryCardX + 5, summaryCardY + 42);
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(`₹${roomCharges.toFixed(2)}`, summaryCardX + 50, summaryCardY + 12);
      pdf.text(`₹${additionalCharges.toFixed(2)}`, summaryCardX + 50, summaryCardY + 22);
      pdf.text(`₹${subtotal.toFixed(2)}`, summaryCardX + 50, summaryCardY + 32);
      pdf.text(`₹${advanceAmount.toFixed(2)}`, summaryCardX + 50, summaryCardY + 42);
      
      // Total amount due with emphasis
      currentY += summaryCardHeight + 10;
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(40, 40, 40);
      pdf.text('Total Amount Due:', pageWidth - 100, currentY);
      pdf.text(`₹${balanceAmount.toFixed(2)}`, pageWidth - 20, currentY, { align: 'right' });
      currentY += 20;
      
      // Add advance payments table if any
      const advances = billData.advances || [];
      if (advances.length > 0) {
        currentY += 5;
        pdf.setFontSize(16);
        pdf.setTextColor(40, 40, 40);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Advance Payments', margin, currentY);
        currentY += 12;
        
        // Advance payments table with modern styling
        const advanceTableStartX = margin;
        const advanceTableWidth = pageWidth - (margin * 2);
        const advanceRowHeight = 10;
        
        // Table headers with background
        pdf.setFillColor(60, 60, 60);
        pdf.rect(advanceTableStartX, currentY, advanceTableWidth, advanceRowHeight, 'F');
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('Date', advanceTableStartX + 5, currentY + 7);
        pdf.text('Receipt No', advanceTableStartX + 40, currentY + 7);
        pdf.text('Payment Mode', advanceTableStartX + 80, currentY + 7);
        pdf.text('Amount (₹)', advanceTableStartX + advanceTableWidth - 5, currentY + 7, { align: 'right' });
        
        currentY += advanceRowHeight;
        
        // Advance payments content with alternating row colors
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(40, 40, 40);
        
        advances.forEach((advance: any, index: number) => {
          const date = advance.date ? new Date(advance.date).toLocaleDateString() : 'N/A';
          
          // Alternating row colors
          if (index % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(advanceTableStartX, currentY, advanceTableWidth, advanceRowHeight, 'F');
          }
          
          pdf.text(date, advanceTableStartX + 5, currentY + 7);
          pdf.text(advance.receiptNo || 'N/A', advanceTableStartX + 40, currentY + 7);
          pdf.text(advance.modeOfPaymentName || advance.modeOfPaymentId || 'N/A', advanceTableStartX + 80, currentY + 7);
          pdf.text(`₹${advance.amount?.toFixed(2) || '0.00'}`, advanceTableStartX + advanceTableWidth - 5, currentY + 7, { align: 'right' });
          currentY += advanceRowHeight;
          
          // Check if we need a new page
          if (currentY > pageHeight - 80) {
            pdf.addPage();
            currentY = margin;
          }
        });
      }
      
      // Add footer with modern styling
      currentY = pageHeight - 40;
      
      // Add decorative separator
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;
      
      // Add thank you message
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(40, 40, 40);
      pdf.text('Thank You for Your Business!', pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;
      
      // Add website
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('www.hotelstar.com', pageWidth / 2, currentY, { align: 'center' });
      
      // Save the PDF
      const fileName = `Bill_${billData.billNo || 'unknown'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      showNotification('Error generating PDF. Please try again.', false);
      showNotification('Failed to generate PDF. Please try again.', false);
    }
  };

  // Handle expenses entry
  const handleExpensesEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!expensesData.folioNo || !expensesData.accHeadId || !expensesData.amount) {
        showNotification('Please fill all required fields.', false);
        setLoading(false);
        return;
      }
      
      // Get guest name by folio number if not already provided
      let guestName = expensesData.guestName;
      if (!guestName) {
        try {
          const checkInsRes = await checkInApi.searchCheckIns(expensesData.folioNo);
          if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
            const checkIn = checkInsRes.data.data.find((c: CheckIn) => c.folioNo === expensesData.folioNo);
            if (checkIn) {
              guestName = checkIn.guestName;
            }
          }
        } catch (error) {
          showNotification('Failed to fetch guest name. Please try again.', false);
        }
      }
      
      // Create transaction using the same API as TransactionForm.tsx
      const transactionResponse = await transactionApi.createInhouseTransaction({
        folioNo: expensesData.folioNo,
        guestName: guestName || 'Unknown Guest',
        accHeadId: expensesData.accHeadId,
        amount: expensesData.amount,
        narration: expensesData.narration,
        voucherNo: expensesData.voucherNo || undefined,
        includingGst: expensesData.includingGst,
      });
      
      if (transactionResponse.data.success) {
        showNotification('Expenses recorded successfully!', true);
        
        // Reset form
        setExpensesData({
          folioNo: '',
          guestName: '',
          accHeadId: '',
          amount: 0,
          narration: '',
          voucherNo: '',
          includingGst: 'N',
        });
      } else {
        throw new Error(transactionResponse.data.message || 'Failed to record expenses');
      }
    } catch (error: any) {
      showNotification('Error recording expenses. Please try again.', false);
      showNotification(`Error: ${error.response?.data?.message || error.message || 'Failed to record expenses'}`, false);
    } finally {
      setLoading(false);
    }
  };

  // Function to auto-fill guest name for settlement entry based on folio number
  const autoFillGuestNameForSettlement = async (folioNo: string) => {
    if (!folioNo) {
      setSettlementData(prev => ({ ...prev, guestName: '' }));
      return;
    }
    
    try {
      const checkInsRes = await checkInApi.searchCheckIns(folioNo);
      if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
        const checkIn = checkInsRes.data.data.find((c: CheckIn) => c.folioNo === folioNo);
        if (checkIn) {
          setSettlementData(prev => ({ ...prev, guestName: checkIn.guestName }));
        } else {
          setSettlementData(prev => ({ ...prev, guestName: '' }));
        }
      } else {
        setSettlementData(prev => ({ ...prev, guestName: '' }));
      }
    } catch (error) {
      showNotification('Failed to fetch guest name for settlement entry. Please try again.', false);
      setSettlementData(prev => ({ ...prev, guestName: '' }));
    }
  };

  // Handle settlement entry
  const handleSettlementEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!settlementData.folioNo || !settlementData.settlementTypeId || !settlementData.amount) {
        showNotification('Please fill all required fields.', false);
        setLoading(false);
        return;
      }
      
      // Get the settlement type name for payment notes
      const settlementType = settlementTypes.find(type => type.id === settlementData.settlementTypeId);
      const paymentNotes = settlementData.remarks || `Settlement via ${settlementType?.name || settlementData.settlementTypeId}`;
      
      // First, we need to get or generate a bill for this folio
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const nextYear = currentYear + 1;
      const financialYear = `${currentYear.toString().slice(-2)}-${nextYear.toString().slice(-2)}`;
      
      // Try to get existing bill data by folio number
      let billNo: string;
      try {
        const billResponse = await billApi.getBillByFolio(settlementData.folioNo);
        if (billResponse.data.success && billResponse.data.data) {
          billNo = billResponse.data.data.billNo;
        } else {
          // Generate a new bill if not found
          const generateResponse = await billApi.generateBill(settlementData.folioNo, financialYear);
          if (generateResponse.data.success && generateResponse.data.data) {
            billNo = generateResponse.data.data.billNo;
          } else {
            throw new Error('Failed to generate bill');
          }
        }
      } catch (error) {
        // If fetching bill by folio fails, try to generate a new bill
        const generateResponse = await billApi.generateBill(settlementData.folioNo, financialYear);
        if (generateResponse.data.success && generateResponse.data.data) {
          billNo = generateResponse.data.data.billNo;
        } else {
          throw new Error('Failed to generate bill');
        }
      }
      
      // Now add the payment/settlement to the bill
      const paymentResponse = await billApi.addPaymentToBill(billNo, {
        paymentAmount: settlementData.amount,
        modeOfPaymentId: settlementData.settlementTypeId,
        paymentNotes: paymentNotes
      });
      
      if (paymentResponse.data.success) {
        showNotification('Settlement recorded successfully!', true);
        
        // Reset form
        setSettlementData({
          folioNo: '',
          guestName: '',
          settlementTypeId: '',
          amount: 0,
          remarks: '',
        });
      } else {
        throw new Error(paymentResponse.data.message || 'Failed to record settlement');
      }
    } catch (error: any) {
      showNotification('Error recording settlement. Please try again.', false);
      showNotification(`Error: ${error.response?.data?.message || error.message || 'Failed to record settlement'}`, false);
    } finally {
      setLoading(false);
    }
  };

  // Handle sales receipts
  const handleSalesReceipts = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!salesData.accHeadId || !salesData.amount || !salesData.modeOfPaymentId) {
        showNotification('Please fill all required fields.', false);
        setLoading(false);
        return;
      }
      
      // Create sales receipt using the new API
      const response = await transactionApi.createSalesReceipt({
        receiptNo: salesData.receiptNo,
        date: salesData.date,
        modeOfPaymentId: salesData.modeOfPaymentId,
        amount: salesData.amount,
        voucherNo: salesData.voucherNo,
        narration: salesData.narration,
        shiftNo: salesData.shiftNo,
        shiftDate: salesData.shiftDate,
      });
      
      if (response.data.success) {
        showNotification('Sales receipt recorded successfully!', true);
        
        // Reset form with new auto-generated receipt number
        setSalesData({
          receiptNo: `AUTO-GEN-${Math.floor(Math.random() * 9000 + 1000)}`,
          date: new Date().toISOString().split('T')[0],
          accHeadId: '',
          amount: 0,
          narration: '',
          modeOfPaymentId: '',
          voucherNo: '',
          shiftNo: '1',
          shiftDate: new Date().toISOString().split('T')[0],
        });
      } else {
        throw new Error(response.data.message || 'Failed to record sales receipt');
      }
    } catch (error: any) {
      showNotification('Error recording sales receipt. Please try again.', false);
      showNotification(`Error: ${error.response?.data?.message || error.message || 'Failed to record sales receipt'}`, false);
    } finally {
      setLoading(false);
    }
  };

  // Handle split bill
  const handleSplitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!splitBillData.folioNo || !splitBillData.originalAmount || !splitBillData.splitAmount) {
        showNotification('Please fill all required fields.', false);
        setLoading(false);
        return;
      }
      
      showNotification('Split bill functionality is not fully implemented in the backend API. In a real implementation, this would split the bill.', false);
      
      // Reset form
      setSplitBillData({
        folioNo: '',
        guestName: '',
        originalAmount: 0,
        splitAmount: 0,
        remainingAmount: 0,
      });
    } catch (error: any) {
      showNotification(`Error: ${error.response?.data?.message || 'Failed to split bill'}`, false);
    } finally {
      setLoading(false);
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
            {activeTab === 'record' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Record New Advance</h2>
                  
                  {/* Sub-tabs for Record Advance */}
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 mt-4">
                    <button
                      type="button"
                      onClick={() => handleRecordSubTabChange('reservation')}
                      className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                        recordSubTab === 'reservation'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      By Reservation
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRecordSubTabChange('bill')}
                      className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                        recordSubTab === 'bill'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      By Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRecordSubTabChange('room')}
                      className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                        recordSubTab === 'room'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      By Room
                    </button>
                  </div>
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
                    
                    {/* Context Dropdown (for reservation and bill) or Room Number (for room) */}
                    {recordSubTab !== 'room' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {recordSubTab === 'reservation' ? 'Reservation Number *' : 'Bill Number *'}
                        </label>
                        <input
                          type="text"
                          name="contextValue"
                          value={formData.contextValue}
                          onChange={handleInputChange}
                          placeholder={recordSubTab === 'reservation' ? "e.g., 1-25-26" : "e.g., B12345"}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          {recordSubTab === 'reservation' 
                            ? "Enter reservation number (will be prefixed with 'R')" 
                            : "Enter bill number (will be prefixed with 'B')"}
                        </p>
                        {/* Display reservation information when available */}
                        {recordSubTab === 'reservation' && formData.guestName && !billInfo.folioNo && (
                          <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-green-800">
                              <span className="font-medium">Guest:</span> {formData.guestName}
                            </p>
                          </div>
                        )}
                        {/* Display bill information when available */}
                        {recordSubTab === 'bill' && billInfo.folioNo && (
                          <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-green-800">
                              <span className="font-medium">Folio:</span> {billInfo.folioNo}
                            </p>
                            <p className="text-sm text-green-800">
                              <span className="font-medium">Guest:</span> {billInfo.guestName}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Room Number *
                        </label>
                        <input
                          type="text"
                          name="roomNo"
                          value={formData.roomNo}
                          onChange={handleInputChange}
                          placeholder="e.g., 101"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                        {/* Display folio number and guest name when available */}
                        {roomAdvanceInfo.folioNo && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                              <span className="font-medium">Folio:</span> {roomAdvanceInfo.folioNo}
                            </p>
                            <p className="text-sm text-blue-800">
                              <span className="font-medium">Guest:</span> {roomAdvanceInfo.guestName}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
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
                          readOnly={recordSubTab === 'room'} // Read-only for room advances
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
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      disabled={loading}
                    >
                      {loading ? 'Recording...' : 'Record Advance'}
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
                {editingAdvance ? (
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
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Context</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Amount</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Payment Mode</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {advances.length > 0 ? (
                            advances.map(advance => (
                              <tr key={advance.advanceId} className="border-b border-gray-200">
                                <td className="px-4 py-2 text-sm text-gray-700">{advance.receiptNo}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{advance.date?.split('T')[0]}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{advance.guestName}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">
                                  {advance.reservationNo ? `R: ${advance.reservationNo}` : 
                                   advance.folioNo ? `F: ${advance.folioNo}` : 
                                   advance.billNo ? `B: ${advance.billNo}` : 'N/A'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-700">₹{advance.amount?.toFixed(2) || '0.00'}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">
                                  {advance.modeOfPaymentName || advance.modeOfPaymentId || 'N/A'}
                                </td>
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
                                    onClick={() => advance.advanceId && handleDeleteAdvance(advance.advanceId)}
                                    className="ml-2 px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="px-4 py-2 text-sm text-gray-700" colSpan={7}>
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
                          <option key={head.accHeadId} value={head.accHeadId}>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Including GST</label>
                    <div className="flex items-center space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="includingGst"
                          value="Y"
                          checked={expensesData.includingGst === 'Y'}
                          onChange={() => setExpensesData(prev => ({ ...prev, includingGst: 'Y' }))}
                          className="form-radio h-4 w-4 text-indigo-600"
                        />
                        <span className="ml-2">Yes</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="includingGst"
                          value="N"
                          checked={expensesData.includingGst === 'N'}
                          onChange={() => setExpensesData(prev => ({ ...prev, includingGst: 'N' }))}
                          className="form-radio h-4 w-4 text-indigo-600"
                        />
                        <span className="ml-2">No</span>
                      </label>
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
                          <option key={head.accHeadId} value={head.accHeadId}>
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
                    {/* Voucher Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voucher Number
                      </label>
                      <input
                        type="text"
                        name="voucherNo"
                        value={salesData.voucherNo}
                        onChange={handleSalesInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        value={salesData.narration}
                        onChange={handleSalesInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Shift Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shift Number
                      </label>
                      <input
                        type="text"
                        name="shiftNo"
                        value={salesData.shiftNo}
                        onChange={handleSalesInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    {/* Shift Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shift Date
                      </label>
                      <input
                        type="date"
                        name="shiftDate"
                        value={salesData.shiftDate}
                        onChange={handleSalesInputChange}
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
                      {loading ? 'Processing...' : 'Record Sales Receipt'}
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
                    <div className="font-medium text-gray-900">₹{summary.totalToday.toFixed(2)}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-gray-700">Transaction Count</div>
                    <div className="font-medium text-gray-900">{summary.transactionCount}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-gray-700">Average Amount</div>
                    <div className="font-medium text-gray-900">₹{summary.avgAmount.toFixed(2)}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-gray-700">Last Week Total</div>
                    <div className="font-medium text-gray-900">₹{summary.lastWeekTotal.toFixed(2)}</div>
                  </div>
                  <div className="mt-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={summary.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                        <Bar dataKey="amount" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        type={modalType}
        onConfirm={modalAction || undefined}
        confirmText={confirmText}
        cancelText={cancelText}
        showConfirmButton={showConfirmButton}
        showCancelButton={showCancelButton}
      >
        <p>{modalMessage}</p>
      </Modal>
    </Layout>
  );
};

export default Cashier;