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
import HotelExpenseEntry from '../components/HotelExpenseEntry';
import SalesReceipts from '../components/SalesReceipts';
import SplitBill from '../components/SplitBill';

const Cashier = () => {
  const [activeTab, setActiveTab] = useState<'record' | 'edit' | 'view' | 'reprint' | 'expenses' | 'settlement' | 'sales' | 'split'>('record');
  const [recordSubTab, setRecordSubTab] = useState<'reservation' | 'bill' | 'room'>('reservation');
  const [loading, setLoading] = useState(false);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const [settlementTypes, setSettlementTypes] = useState<SettlementType[]>([]);
  const [contextOptions, setContextOptions] = useState<any[]>([]);
  
  // Add state for search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'reservation' | 'guest' | 'receipt'>('all');
  const [searchDate, setSearchDate] = useState('');
  
  // Add state for in-house rooms
  const [inHouseRooms, setInHouseRooms] = useState<Room[]>([]);
  // Add state for in-house reservations
  const [inHouseReservations, setInHouseReservations] = useState<Reservation[]>([]);
  // Add state for generated bills
  const [generatedBills, setGeneratedBills] = useState<any[]>([]);
  
  // Form state for different record types
  const [formData, setFormData] = useState({
    receiptNumber: `AUTO-GEN-${Math.floor(Math.random() * 9000 + 1000)}`,
    contextValue: '',
    date: new Date().toISOString().split('T')[0],
    modeOfPaymentId: '',
    amount: '',
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
  
  // Available bills for reprint help window
  const [availableBills, setAvailableBills] = useState<any[]>([]);
  const [showBillsHelp, setShowBillsHelp] = useState(false);
  const [billsLoading, setBillsLoading] = useState(false);

  const handleClearForm = () => {
    setFormData({
      receiptNumber: `AUTO-GEN-${Math.floor(Math.random() * 9000 + 1000)}`,
      contextValue: '',
      date: new Date().toISOString().split('T')[0],
      modeOfPaymentId: '',
      amount: '',
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
    setRoomAdvanceInfo({ folioNo: '', guestName: '' });
  };
  
  // Expenses Entry state
  const [expensesData, setExpensesData] = useState({
    folioNo: '',
    guestName: '',
    accHeadId: '',
    amount: 0,
    narration: '',
    voucherNo: '',
    includingGst: 'N' as 'Y' | 'N',
    // Add billNo field
    billNo: '',
  });
  
  // Settlement Entry state
  const [settlementData, setSettlementData] = useState({
    billNo: '',
    guestName: '',
    settlementTypeId: '',
    amount: 0,
    remarks: '',
    // Add fields for receipt and refund handling
    receiptNo: '',
    isRefund: false,
    refundAmount: 0,
  });
  
  // Add state for available bills for settlement
  const [availableSettlementBills, setAvailableSettlementBills] = useState<any[]>([]);
  const [showSettlementBillsHelp, setShowSettlementBillsHelp] = useState(false);
  const [settlementBillsLoading, setSettlementBillsLoading] = useState(false);
  
  // Sales Receipts state (removed - now handled by SalesReceipts component)
  
  // Split Bill state (removed - now handled by SplitBill component)
  
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
  
  // Function to change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
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
  // Add state for room number error
  const [roomNoError, setRoomNoError] = useState<string | null>(null);
  
  // Add state for room information
  const [roomInfo, setRoomInfo] = useState<Record<string, string>>({}); // folioNo -> roomNo mapping
  
  // Add function to fetch in-house rooms (rooms with checked-in guests)
  const fetchInHouseRooms = async () => {
    try {
      // Get all in-house guests
      const checkInsRes = await checkInApi.getInHouseGuests();
      if (checkInsRes.data.success) {
        // Get all rooms
        const roomsRes = await roomApi.getRooms();
        if (roomsRes.data.success) {
          // Filter to only rooms with checked-in guests (not checked out)
          const checkedInGuests = checkInsRes.data.data.filter(guest => !guest.checkout);
          const inHouseRoomIds = new Set(checkedInGuests.map(guest => guest.roomId));
          const inHouseRoomsList = roomsRes.data.data.filter(room => inHouseRoomIds.has(room.roomId));
          setInHouseRooms(inHouseRoomsList);
        }
      }
    } catch (error) {
      console.error('Error fetching in-house rooms:', error);
    }
  };

  // Add function to fetch in-house reservations (reservations with checked-in guests)
  const fetchInHouseReservations = async () => {
    try {
      // Get all reservations
      const reservationsRes = await reservationApi.getReservations();
      if (reservationsRes.data.success) {
        // Get all in-house guests
        const checkInsRes = await checkInApi.getInHouseGuests();
        if (checkInsRes.data.success) {
          // Filter to only reservations with checked-in guests (not checked out)
          const checkedInGuests = checkInsRes.data.data.filter(guest => !guest.checkout);
          const inHouseReservationNos = new Set(checkedInGuests.map(guest => guest.reservationNo));
          const inHouseReservationsList = reservationsRes.data.data.filter(reservation => 
            inHouseReservationNos.has(reservation.reservationNo)
          );
          setInHouseReservations(inHouseReservationsList);
        }
      }
    } catch (error) {
      console.error('Error fetching in-house reservations:', error);
    }
  };

  // Add function to fetch generated bills
  const fetchGeneratedBills = async () => {
    try {
      // Get all in-house guests
      const checkInsRes = await checkInApi.getInHouseGuests();
      if (checkInsRes.data.success) {
        // For each in-house guest, try to get their bill
        const bills = [];
        const checkedInGuests = checkInsRes.data.data.filter(guest => !guest.checkout);
        
        for (const guest of checkedInGuests) {
          try {
            // Generate a preview bill for this folio
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const nextYear = currentYear + 1;
            const financialYear = `${currentYear.toString().slice(-2)}-${nextYear.toString().slice(-2)}`;
            const billResponse = await billApi.generateBill(guest.folioNo, financialYear);
            if (billResponse.data.success && billResponse.data.data) {
              bills.push(billResponse.data.data);
            }
          } catch (error) {
            // Continue to next guest if bill generation fails for this one
            console.error(`Error generating bill for folio ${guest.folioNo}:`, error);
          }
        }
        
        setGeneratedBills(bills);
      }
    } catch (error) {
      console.error('Error fetching generated bills:', error);
    }
  };

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
  
  // Function to fetch available bills for reprint help
  const fetchAvailableBills = async () => {
    setBillsLoading(true);
    try {
      // Get all in-house guests
      const checkInsRes = await checkInApi.getInHouseGuests();
      if (checkInsRes.data.success) {
        const bills = [];
        
        // For each in-house guest, try to get their bill
        for (const guest of checkInsRes.data.data) {
          if (guest.folioNo) {
            try {
              // Generate a preview bill for this folio
              const currentDate = new Date();
              const currentYear = currentDate.getFullYear();
              const nextYear = currentYear + 1;
              const financialYear = `${currentYear.toString().slice(-2)}-${nextYear.toString().slice(-2)}`;
              const billResponse = await billApi.generateBill(guest.folioNo, financialYear);
              if (billResponse.data.success && billResponse.data.data) {
                bills.push(billResponse.data.data);
              }
            } catch (error) {
              // Continue to next guest if bill generation fails for this one
              console.error(`Error generating bill for folio ${guest.folioNo}:`, error);
            }
          }
        }
        
        setAvailableBills(bills);
      }
    } catch (error) {
      console.error('Error fetching available bills:', error);
      showNotification('Failed to fetch available bills. Please try again.', false);
    } finally {
      setBillsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentModes();
    fetchAccountHeads();
    fetchSettlementTypes();
    fetchSummary();
    fetchRoomInfo(); // Fetch room information on component mount
    
    // Cleanup function to clear timeout on unmount
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Fetch advances when activeTab changes to 'view' or when search parameters change
  useEffect(() => {
    if (activeTab === 'view') {
      fetchAdvances();
    }
  }, [activeTab, searchTerm, searchType, searchDate]);

  // Fetch in-house data when recordSubTab changes
  useEffect(() => {
    if (recordSubTab === 'room') {
      fetchInHouseRooms();
    } else if (recordSubTab === 'reservation') {
      fetchInHouseReservations();
    } else if (recordSubTab === 'bill') {
      fetchGeneratedBills();
    }
  }, [recordSubTab]);

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

  // Fetch all advances for viewing with search capability
  const fetchAdvances = async () => {
    try {
      setAdvancesLoading(true);
      
      let allAdvances: Advance[] = [];
      
      // If we have a search term or date filter, filter advances
      if (searchTerm.trim() || searchDate) {
        // Get all advances first
        let response;
        try {
          response = await advanceApi.getAllAdvances();
        } catch (error) {
          console.error('Error fetching all advances:', error);
          showNotification('Failed to fetch advances. Please try again.', false);
          return;
        }
        
        if (!response || !response.data.success) {
          showNotification('Failed to fetch advances. Please try again.', false);
          return;
        }
        
        allAdvances = response.data.data;
        
        // Apply search term filter if provided
        if (searchTerm.trim()) {
          switch (searchType) {
            case 'reservation':
              // Filter by reservation number
              allAdvances = allAdvances.filter(advance => 
                advance.reservationNo && 
                advance.reservationNo.toLowerCase().includes(searchTerm.trim().toLowerCase())
              );
              break;
              
            case 'guest':
              // Filter by guest name
              allAdvances = allAdvances.filter(advance => 
                advance.guestName && 
                advance.guestName.toLowerCase().includes(searchTerm.trim().toLowerCase())
              );
              break;
              
            case 'receipt':
              // Filter by receipt number
              allAdvances = allAdvances.filter(advance => 
                advance.receiptNo && 
                advance.receiptNo.toLowerCase().includes(searchTerm.trim().toLowerCase())
              );
              break;
              
            case 'all':
            default:
              // Search across all fields
              const term = searchTerm.trim().toLowerCase();
              allAdvances = allAdvances.filter(advance => 
                (advance.reservationNo && advance.reservationNo.toLowerCase().includes(term)) ||
                (advance.guestName && advance.guestName.toLowerCase().includes(term)) ||
                (advance.receiptNo && advance.receiptNo.toLowerCase().includes(term))
              );
              break;
          }
        }
        
        // Apply date filter if provided
        if (searchDate) {
          allAdvances = allAdvances.filter(advance => {
            if (!advance.date) return false;
            const advanceDate = new Date(advance.date).toISOString().split('T')[0];
            return advanceDate === searchDate;
          });
        }
      } else {
        // No search term or date filter, get all advances
        try {
          const response = await advanceApi.getAllAdvances();
          if (response.data.success) {
            allAdvances = response.data.data;
          }
        } catch (error) {
          console.error('Error fetching all advances:', error);
          showNotification('Failed to fetch advances. Please try again.', false);
        }
      }
      
      // Sort advances by date (oldest first - ascending order)
      allAdvances.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      setAdvances(allAdvances);
    } catch (error) {
      showNotification('Failed to fetch advances. Please try again.', false);
      setAdvances([]);
    } finally {
      setAdvancesLoading(false);
      // Refresh room info when fetching advances
      fetchRoomInfo();
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

  // Function to get room number by folio number
  const getRoomNoByFolio = (folioNo: string) => {
    return roomInfo[folioNo] || 'N/A';
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
  
  // Function to fetch room information for all check-ins
  const fetchRoomInfo = async () => {
    try {
      const checkInsRes = await checkInApi.getInHouseGuests();
      if (checkInsRes.data.success) {
        const roomInfoMap: Record<string, string> = {};
        checkInsRes.data.data.forEach((checkIn: CheckIn) => {
          if (checkIn.folioNo && checkIn.roomNo) {
            roomInfoMap[checkIn.folioNo] = checkIn.roomNo;
          }
        });
        setRoomInfo(roomInfoMap);
      }
    } catch (error) {
      console.error('Error fetching room info:', error);
    }
  };
  
  // Add function to handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    fetchAdvances();
  };

  // Add function to clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchType('all');
    setSearchDate('');
    setCurrentPage(1);
    fetchAdvances();
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

  // handleSalesInputChange function removed - now handled by SalesReceipts component

  // handleSplitBillInputChange function removed - now handled by SplitBill component

  // Function to auto-fill guest name based on context value
  const autoFillGuestName = async (contextValue: string) => {
    // Reset the attempted flag and error when context value is cleared
    if (!contextValue) {
      setFormData(prev => ({ ...prev, guestName: '' }));
      setAttemptedAutoFill(false);
      setContextError(null);
      setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
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
        if (recordSubTab === 'reservation') {
          // Find reservation in in-house reservations
          const reservation = inHouseReservations.find(r => r.reservationNo === contextValue);
          if (reservation) {
            setFormData(prev => ({ ...prev, guestName: reservation.guestName }));
            setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
          } else {
            setFormData(prev => ({ ...prev, guestName: '' }));
            setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
            setContextError('Reservation not found');
          }
        } else if (recordSubTab === 'bill') {
          // Find bill in generated bills
          const bill = generatedBills.find(b => b.billNo === contextValue);
          if (bill) {
            const guestName = bill.guestName || '';
            const folioNo = bill.folioNo || '';
            setFormData(prev => ({ ...prev, guestName }));
            setBillInfo({ folioNo, guestName });
          } else {
            setFormData(prev => ({ ...prev, guestName: '' }));
            setBillInfo({ folioNo: '', guestName: '' }); // Clear bill info
            setContextError('Bill not found');
          }
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
    // Reset the attempted flag and error when room number is cleared
    if (!roomNo) {
      setFormData(prev => ({ ...prev, guestName: '' }));
      setRoomAdvanceInfo({ folioNo: '', guestName: '' });
      setRoomNoError(null);
      return;
    }

    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for debouncing
    const timer = setTimeout(async () => {
      setAutoFillLoading(true);
      setRoomNoError(null);

      try {
        // First, find the room in in-house rooms
        const room = inHouseRooms.find((r: Room) => r.roomNo === roomNo);
        if (room) {
          // Now get the guest name and folio number by room ID
          const checkInRes = await checkInApi.getCheckInByRoom(room.roomId);
          if (checkInRes.data.success && checkInRes.data.data) {
            // Check if the guest has checked out (checkout status should be false for advances)
            const checkInData = checkInRes.data.data;
            if (checkInData.checkout === true) {
              setFormData(prev => ({ ...prev, guestName: '' }));
              setRoomAdvanceInfo({ folioNo: '', guestName: '' });
              setRoomNoError('Guest has already checked out from this room. Cannot accept advance payments.');
              return;
            }

            const guestName = checkInRes.data.data.guestName;
            const folioNo = checkInRes.data.data.folioNo;
            setFormData(prev => ({ ...prev, guestName }));
            setRoomAdvanceInfo({ folioNo, guestName });
          } else {
            setFormData(prev => ({ ...prev, guestName: '' }));
            setRoomAdvanceInfo({ folioNo: '', guestName: '' });
            setRoomNoError('No guest found in this room');
          }
        } else {
          setFormData(prev => ({ ...prev, guestName: '' }));
          setRoomAdvanceInfo({ folioNo: '', guestName: '' });
          setRoomNoError('Room not found or no guest checked in');
        }
      } catch (error) {
        showNotification('Failed to fetch guest name for room advance. Please try again.', false);
        setFormData(prev => ({ ...prev, guestName: '' }));
        setRoomAdvanceInfo({ folioNo: '', guestName: '' });
        setRoomNoError('Failed to fetch guest information for room');
      } finally {
        setAutoFillLoading(false);
      }
    }, 300); // 300ms debounce delay

    setDebounceTimer(timer);
  };

  // Helper function to determine context type
  const getContextType = (contextValue: string): string => {
    if (!contextValue) return 'Unknown';
    if (contextValue.startsWith('R') || /^[0-9]/.test(contextValue)) return 'Reservation';
    if (contextValue.startsWith('F')) return 'Folio';
    if (contextValue.startsWith('B')) return 'Bill';
    return 'Unknown';
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
        // Normalize the contextValue for edit form (add prefix if missing based on detected type)
        let normalizedContextValue = contextValue.trim();
        
        // Auto-detect type and add prefix if missing
        if (normalizedContextValue && !/^[RFBrfb]/.test(normalizedContextValue)) {
          // Try to determine type by checking if it matches reservation pattern
          if (/^\d/.test(normalizedContextValue)) {
            // Assume it's a reservation number
            normalizedContextValue = 'R' + normalizedContextValue;
          }
        }
        
        // Check if normalizedContextValue has a valid prefix
        if (/^[RFBrfb]/.test(normalizedContextValue)) {
          // Determine context type by prefix (case insensitive)
          if (/^F/i.test(normalizedContextValue)) {
            // Folio (inhouse) - get advances by folio number to extract guest name
            try {
              const response = await advanceApi.getAdvancesByFolio(normalizedContextValue);
              if (response.data.success && response.data.data.length > 0) {
                // Get guest name from the first advance record
                const guestName = response.data.data[0].guestName;
                if (guestName) {
                  setEditForm(prev => ({ ...prev, guestName }));
                } else {
                  // If no guest name in advances, fall back to check-in API
                  try {
                    const checkInsRes = await checkInApi.searchCheckIns(normalizedContextValue);
                    if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
                      const checkIn = checkInsRes.data.data.find((c: CheckIn) => c.folioNo === normalizedContextValue);
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
                  const checkInsRes = await checkInApi.searchCheckIns(normalizedContextValue);
                  if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
                    const checkIn = checkInsRes.data.data.find((c: CheckIn) => c.folioNo === normalizedContextValue);
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
          } else if (/^R/i.test(normalizedContextValue)) {
            // Reservation - get advances by reservation number to extract guest name
            try {
              // Remove 'R' prefix if present to match the database format
              const reservationNo = normalizedContextValue.trim().replace(/^R/i, '');
              
              // First try to get guest name from reservation API
              try {
                const reservationResponse = await reservationApi.searchReservations(reservationNo);
                if (reservationResponse.data.success && reservationResponse.data.data.length > 0) {
                  // Find the exact match for the reservation number
                  const reservation = reservationResponse.data.data.find((r: any) => 
                    r.reservationNo === reservationNo
                  );
                  if (reservation) {
                    // Check if all rooms for this reservation have been assigned
                    const roomsCheckedIn = reservation.roomsCheckedIn || 0;
                    const noOfRooms = reservation.noOfRooms || 0;
                    
                    if (roomsCheckedIn >= noOfRooms) {
                      showNotification('All rooms for this reservation have already been assigned. Cannot accept advance payments.', false);
                    }
                    
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
          } else if (/^B/i.test(normalizedContextValue)) {
            // Bill - try to get guest name and folio number by generating a preview of the bill
            try {
              // Extract the bill number (remove 'B' prefix if present)
              const billNo = normalizedContextValue.trim().replace(/^B/i, '');
              
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

  // Function to auto-fill guest name for split bill based on folio number (removed - now handled by SplitBill component)

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
        amount: Number(formData.amount),
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
        
        // Check if all rooms for this reservation have been assigned
        try {
          const reservationResponse = await reservationApi.searchReservations(reservationNo.replace(/^R/, ''));
          if (reservationResponse.data.success && reservationResponse.data.data.length > 0) {
            const reservation = reservationResponse.data.data.find((r: any) => 
              r.reservationNo === reservationNo.replace(/^R/, '')
            );
            
            if (reservation) {
              const roomsCheckedIn = reservation.roomsCheckedIn || 0;
              const noOfRooms = reservation.noOfRooms || 0;
              
              if (roomsCheckedIn >= noOfRooms) {
                showNotification('All rooms for this reservation have already been assigned. Cannot accept advance payments.', false);
                setLoading(false);
                return;
              }
            }
          }
        } catch (reservationError) {
          // Continue with advance creation if reservation check fails
          console.error('Error checking reservation status:', reservationError);
        }
        
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
        // Room - check if guest has checked out before creating advance
        try {
          // First get the room ID by room number
          const roomsRes = await roomApi.getRooms();
          if (roomsRes.data.success) {
            const room = roomsRes.data.data.find((r: Room) => r.roomNo === formData.roomNo);
            if (room) {
              // Now get the check-in data by room ID
              const checkInRes = await checkInApi.getCheckInByRoom(room.roomId);
              if (checkInRes.data.success && checkInRes.data.data) {
                // Check if the guest has checked out (checkout status should be false for advances)
                const checkInData = checkInRes.data.data;
                if (checkInData.checkout === true) {
                  showNotification('Guest has already checked out from this room. Cannot accept advance payments.', false);
                  setLoading(false);
                  return;
                }
              } else {
                showNotification('No guest found in this room. Cannot accept advance payments.', false);
                setLoading(false);
                return;
              }
            } else {
              showNotification('Room not found. Cannot accept advance payments.', false);
              setLoading(false);
              return;
            }
          } else {
            showNotification('Failed to fetch room information. Cannot accept advance payments.', false);
            setLoading(false);
            return;
          }
        } catch (roomError) {
          showNotification('Error checking room status. Cannot accept advance payments.', false);
          setLoading(false);
          return;
        }
        
        response = await advanceApi.createAdvanceForRoom(formData.roomNo, {
          guestName: formData.guestName,
          modeOfPaymentId: formData.modeOfPaymentId,
          amount: Number(formData.amount),
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
    console.log('Editing advance:', advance);
    if (!advance.receiptNo) {
      console.error('Cannot edit advance: No advanceId found', advance);
      showNotification('Cannot edit advance: Invalid data', false);
      return;
    }
    
    setEditingAdvance(advance);
    setActiveTab('edit');
    
    // Determine the context value with proper prefix
    let contextValue = '';
    if (advance.reservationNo) {
      contextValue = advance.reservationNo.startsWith('R') ? advance.reservationNo : `R${advance.reservationNo}`;
    } else if (advance.folioNo) {
      contextValue = advance.folioNo.startsWith('F') ? advance.folioNo : `F${advance.folioNo}`;
    } else if (advance.billNo) {
      contextValue = advance.billNo.startsWith('B') ? advance.billNo : `B${advance.billNo}`;
    }
    
    // Set the edit form with advance data
    setEditForm({
      receiptNumber: advance.receiptNo || '',
      contextValue: contextValue,
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
    
    // Validate editingAdvance data
    if (!editingAdvance) {
      showNotification('No advance data to update. Please try again.', false);
      return;
    }
    
    if (!editingAdvance.receiptNo) {
      showNotification('Invalid advance receipt number. Please try again.', false);
      showNotification('Invalid advance ID. Please try again.', false);
      return;
    }
    
    // Validate required fields
    if (!editForm.guestName) {
      showNotification('Guest Name is required.', false);
      return;
    }
    
    if (!editForm.modeOfPaymentId) {
      showNotification('Mode of Payment is required.', false);
      return;
    }
    
    if (!editForm.amount || editForm.amount <= 0) {
      showNotification('Amount must be a positive number.', false);
      return;
    }
    
    // Show confirmation dialog before updating
    setModalTitle("Confirm Update");
    setModalMessage("Are you sure you want to update this advance?");
    setModalType('warning');
    setConfirmText("Update");
    setCancelText("Cancel");
    setShowConfirmButton(true);
    setShowCancelButton(true);
    
    // Set the action to perform when confirmed
    setModalAction(() => () => {
      // This function will be called when the user confirms the update
      performUpdate();
    });
    
    setModalOpen(true);
  };

  // Separate function to perform the actual update
  const performUpdate = async () => {
    setLoading(true);
    try {
      // Validate required fields
      if (!editForm.guestName || !editForm.modeOfPaymentId || !editForm.amount) {
        throw new Error('Please fill all required fields (Guest Name, Mode of Payment, and Amount).');
      }
      
      // Prepare the data for update
      const updateData: Partial<Advance> = {
        receiptNo: editForm.receiptNumber, // Add receipt number to update data
        guestName: editForm.guestName,
        modeOfPaymentId: editForm.modeOfPaymentId,
        amount: editForm.amount,
        remarks: editForm.details,
        narration: editForm.narration,
        creditCardCompany: editForm.creditCardCompany,
        cardNumber: editForm.cardNumber,
        onlineCompanyName: editForm.onlineCompanyName,
        date: editForm.date,
      };
      
      // Call the update API - ensure advanceId is not undefined
      if (!editingAdvance || !editingAdvance.receiptNo) {
        throw new Error('Invalid advance data. Please try again.');
      }
      
      console.log('Updating advance with ID:', editingAdvance.advanceId);
      console.log('Update data:', updateData);
      
      // Validate updateData
      if (!updateData.guestName || !updateData.modeOfPaymentId || updateData.amount === undefined) {
        throw new Error('Invalid update data. Please check all required fields.');
      }
      
      const response = await advanceApi.updateAdvance(editingAdvance.receiptNo, updateData);
      
      console.log('Update response:', response);
      
      // Check if response exists
      if (!response) {
        throw new Error('No response received from server');
      }
      
      // Check if response data exists
      if (!response.data) {
        throw new Error('Invalid response format from server');
      }
      
      if (response.data.success) {
        showNotification('Advance updated successfully!');
        
        // After successful update, refresh the view
        setActiveTab('view');
        setEditingAdvance(null);
        fetchAdvances();
        fetchSummary();
      } else {
        throw new Error(response.data.message || 'Failed to update advance');
      }
    } catch (error: any) {
      console.error('Error updating advance:', error);
      
      // Handle different types of errors
      if (error.code === 'ERR_NETWORK') {
        showNotification('Network error: Please check your internet connection and try again.', false);
      } else if (error.response?.status === 401) {
        showNotification('Authentication error: Please log in again.', false);
      } else if (error.response?.status === 403) {
        showNotification('Access denied: You do not have permission to perform this action.', false);
      } else if (error.response?.status === 404) {
        showNotification('Advance not found: The advance may have been deleted.', false);
      } else if (error.response?.status === 500) {
        showNotification('Server error: Please try again later.', false);
      } else if (error.message) {
        showNotification(`Error: ${error.message}`, false);
      } else {
        showNotification('An unexpected error occurred while updating the advance. Please try again.', false);
      }
    } finally {
      setLoading(false);
      setModalOpen(false);
    }
  };

  // Handle deleting an advance
  const handleDeleteAdvance = async (advanceId: string, receiptNo?: string) => {
    console.log('Deleting advance with ID:', advanceId);
    
    // Validate advanceId
    
    
    
    
    // Show confirmation dialog before deleting
    const displayId = receiptNo || advanceId;
    setModalTitle("Confirm Delete");
    setModalMessage(`Are you sure you want to delete advance ${displayId}? This action cannot be undone.`);
    setModalType('warning');
    setConfirmText("Delete");
    setCancelText("Cancel");
    setShowConfirmButton(true);
    setShowCancelButton(true);
    
    // Set the action to perform when confirmed
    setModalAction(() => () => {
      // This function will be called when the user confirms the delete
      performDelete(advanceId);
    });
    
    setModalOpen(true);
  };

  // Separate function to perform the actual delete
  const performDelete = async (advanceId: string) => {
    try {
      console.log('Deleting advance with ID:', advanceId);
      
      // Validate advanceId
      if (!advanceId) {
        throw new Error('Invalid advance ID');
      }
      
      // Show loading state
      setLoading(true);
      
      // Call the delete API
      const response = await advanceApi.deleteAdvance(advanceId);
      
      console.log('Delete response:', response);
      
      // Check if response exists
      if (!response) {
        throw new Error('No response received from server');
      }
      
      // Check if response data exists
      if (!response.data) {
        throw new Error('Invalid response format from server');
      }
      
      if (response.data.success) {
        showNotification('Advance deleted successfully!');
        
        // After successful delete, refresh the view
        fetchAdvances();
        fetchSummary();
      } else {
        throw new Error(response.data.message || 'Failed to delete advance');
      }
    } catch (error: any) {
      console.error('Error deleting advance:', error);
      
      // Handle different types of errors
      if (error.code === 'ERR_NETWORK') {
        showNotification('Network error: Please check your internet connection and try again.', false);
      } else if (error.response?.status === 401) {
        showNotification('Authentication error: Please log in again.', false);
      } else if (error.response?.status === 403) {
        showNotification('Access denied: You do not have permission to perform this action.', false);
      } else if (error.response?.status === 404) {
        showNotification('Advance not found: The advance may have been deleted.', false);
      } else if (error.response?.status === 500) {
        showNotification('Server error: Please try again later.', false);
      } else if (error.message) {
        showNotification(`Error: ${error.message}`, false);
      } else {
        showNotification('An unexpected error occurred while deleting the advance. Please try again.', false);
      }
    } finally {
      setLoading(false);
      setModalOpen(false);
    }
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
      setRoomNoError(null);
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

  // Handle view filter change
  const handleViewFilterChange = (filter: 'all' | 'reservation' | 'bill' | 'room') => {
    // Removed filtering options - always show all advances
    // This function is kept for compatibility but does nothing
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
    // This function is now handled by the HotelExpenseEntry component
    showNotification('Please use the new expense entry form.', false);
  };

  // Function to auto-fill guest name for settlement entry based on bill number
  const autoFillGuestNameForSettlement = async (billNo: string) => {
    if (!billNo) {
      setSettlementData(prev => ({ ...prev, guestName: '', amount: 0 }));
      return;
    }
    
    try {
      // Try to get the bill data by bill number
      const billResponse = await billApi.getBillByBillNo(billNo);
      if (billResponse.data.success && billResponse.data.data) {
        const billData = billResponse.data.data;
        const guestName = billData.guestName || '';
        // Calculate the amount due (total - advances)
        const totalAmount = billData.totalAmount || 0;
        const advanceAmount = billData.advanceAmount || 0;
        const amountDue = Math.max(0, totalAmount - advanceAmount);
        
        setSettlementData(prev => ({ 
          ...prev, 
          guestName,
          amount: amountDue,
          isRefund: advanceAmount > totalAmount,
          refundAmount: advanceAmount > totalAmount ? advanceAmount - totalAmount : 0
        }));
      } else {
        setSettlementData(prev => ({ ...prev, guestName: '', amount: 0 }));
      }
    } catch (error) {
      showNotification('Failed to fetch guest name for settlement entry. Please try again.', false);
      setSettlementData(prev => ({ ...prev, guestName: '', amount: 0 }));
    }
  };

  // Function to fetch available bills for settlement help
  const fetchAvailableSettlementBills = async () => {
    setSettlementBillsLoading(true);
    try {
      // Get all in-house guests
      const checkInsRes = await checkInApi.getInHouseGuests();
      if (checkInsRes.data.success) {
        const bills = [];
        
        // For each in-house guest, try to get their bill
        for (const guest of checkInsRes.data.data) {
          if (guest.folioNo) {
            try {
              // Generate a preview bill for this folio
              const currentDate = new Date();
              const currentYear = currentDate.getFullYear();
              const nextYear = currentYear + 1;
              const financialYear = `${currentYear.toString().slice(-2)}-${nextYear.toString().slice(-2)}`;
              const billResponse = await billApi.generateBill(guest.folioNo, financialYear);
              if (billResponse.data.success && billResponse.data.data) {
                bills.push(billResponse.data.data);
              }
            } catch (error) {
              // Continue to next guest if bill generation fails for this one
              console.error(`Error generating bill for folio ${guest.folioNo}:`, error);
            }
          }
        }
        
        setAvailableSettlementBills(bills);
      }
    } catch (error) {
      console.error('Error fetching available bills for settlement:', error);
      showNotification('Failed to fetch available bills for settlement. Please try again.', false);
    } finally {
      setSettlementBillsLoading(false);
    }
  };

  // Handle settlement entry
  const handleSettlementEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!settlementData.billNo || !settlementData.settlementTypeId || !settlementData.amount) {
        showNotification('Please fill all required fields.', false);
        setLoading(false);
        return;
      }
      
      // Get the settlement type name for payment notes
      const settlementType = settlementTypes.find(type => type.id === settlementData.settlementTypeId);
      const paymentNotes = settlementData.remarks || `Settlement via ${settlementType?.name || settlementData.settlementTypeId}`;
      
      // Generate receipt number for cash settlements
      let receiptNo = settlementData.receiptNo;
      if (settlementType?.name?.toLowerCase().includes('cash')) {
        receiptNo = `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      
      // Add the payment/settlement to the bill
      const paymentResponse = await billApi.addPaymentToBill(settlementData.billNo, {
        paymentAmount: settlementData.amount,
        modeOfPaymentId: settlementData.settlementTypeId,
        paymentNotes: paymentNotes
        // Remove receiptNo since it's not in the type definition
      });
      
      if (paymentResponse.data.success) {
        // If this is a refund, create a refund voucher
        if (settlementData.isRefund && settlementData.refundAmount > 0) {
          const refundVoucherNo = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          // Here you would typically save the refund voucher to the database
          console.log(`Refund voucher ${refundVoucherNo} created for amount ${settlementData.refundAmount}`);
        }
        
        showNotification('Settlement recorded successfully!', true);
        
        // Reset form
        setSettlementData({
          billNo: '',
          guestName: '',
          settlementTypeId: '',
          amount: 0,
          remarks: '',
          receiptNo: '',
          isRefund: false,
          refundAmount: 0,
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

  const handleSettlementInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setSettlementData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
    
    // Auto-fill guest name when bill number changes
    if (name === 'billNo') {
      autoFillGuestNameForSettlement(value);
    }
  };

  // Handle sales receipts (removed - now handled by SalesReceipts component

  // Handle split bill (removed - now handled by SplitBill component)

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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Receipt Number */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Receipt Number
                      </label>
                      <input
                        type="text"
                        name="receiptNumber"
                        value={formData.receiptNumber}
                        disabled
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-xs"
                      />
                    </div>
                    
                    {/* Context Dropdown (for reservation and bill) or Room Number (for room) */}
                    {recordSubTab === 'reservation' ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Reservation Number *
                        </label>
                        <select
                          name="contextValue"
                          value={formData.contextValue}
                          onChange={handleInputChange}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                          required
                        >
                          <option value="">Select a reservation</option>
                          {inHouseReservations.map((reservation) => (
                            <option key={reservation.reservationNo} value={reservation.reservationNo}>
                              {reservation.reservationNo} - {reservation.guestName}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Select reservation (only reservations with checked-in guests are shown)
                        </p>
                        {/* Display reservation information when available */}
                        {formData.guestName && !billInfo.folioNo && (
                          <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-xs text-green-800">
                              <span className="font-medium">Guest:</span> {formData.guestName}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : recordSubTab === 'bill' ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Bill Number *
                        </label>
                        <select
                          name="contextValue"
                          value={formData.contextValue}
                          onChange={handleInputChange}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                          required
                        >
                          <option value="">Select a bill</option>
                          {generatedBills.map((bill) => (
                            <option key={bill.billNo} value={bill.billNo}>
                              {bill.billNo} - {bill.guestName || 'N/A'}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Select bill (only generated bills are shown)
                        </p>
                        {/* Display bill information when available */}
                        {billInfo.folioNo && (
                          <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-xs text-green-800">
                              <span className="font-medium">Folio:</span> {billInfo.folioNo}
                            </p>
                            <p className="text-xs text-green-800">
                              <span className="font-medium">Guest:</span> {billInfo.guestName}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Room Number *
                        </label>
                        <select
                          name="roomNo"
                          value={formData.roomNo}
                          onChange={handleInputChange}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                          required
                        >
                          <option value="">Select a room</option>
                          {inHouseRooms.map((room) => (
                            <option key={room.roomId} value={room.roomNo}>
                              {room.roomNo} - {room.roomTypeName || 'Room'}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Select room number (only rooms with checked-in guests are shown)
                        </p>
                        {/* Display folio number and guest name when available */}
                        {roomAdvanceInfo.folioNo && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-800">
                              <span className="font-medium">Folio:</span> {roomAdvanceInfo.folioNo}
                            </p>
                            <p className="text-xs text-blue-800">
                              <span className="font-medium">Guest:</span> {roomAdvanceInfo.guestName}
                            </p>
                          </div>
                        )}
                        {/* Display error message when room number is invalid */}
                        {roomNoError && (
                          <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-xs text-red-800">
                              {roomNoError}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Date */}
                    <DateInput 
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      label="Date *"
                      required
                    />
                  </div>
                  
                  {/* Guest Name - only for reservation and bill sub-tabs */}
                  {recordSubTab !== 'room' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Guest Name
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="guestName"
                            value={formData.guestName}
                            onChange={handleInputChange}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                          />
                          {autoFillLoading && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Mode of Payment */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Mode of Payment *
                      </label>
                      <select
                        name="modeOfPaymentId"
                        value={formData.modeOfPaymentId}
                        onChange={handleInputChange}
                        required
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
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
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Amount *
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                        placeholder="150.00"
                      />
                    </div>
                  </div>
                  
                  {/* Details */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Details
                    </label>
                    <textarea
                      name="details"
                      value={formData.details}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                  </div>
                  
                  {/* Narration */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Narration
                    </label>
                    <textarea
                      name="narration"
                      value={formData.narration}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleClearForm}
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
                          Recording...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          Record Advance
                        </>
                      )}
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
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        readOnly
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
                        value={editForm.date}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        value={editForm.guestName}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  {/* Context Information Display */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Reservation Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reservation Number
                      </label>
                      <input
                        type="text"
                        value={editingAdvance?.reservationNo || 'N/A'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
                        readOnly
                      />
                    </div>
                    
                    {/* Bill Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bill Number
                      </label>
                      <input
                        type="text"
                        value={editingAdvance?.billNo || 'N/A'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
                        readOnly
                      />
                    </div>
                    
                    {/* Room Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Room Number
                      </label>
                      <input
                        type="text"
                        value={editingAdvance?.folioNo ? getRoomNoByFolio(editingAdvance.folioNo) : 'N/A'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 focus:outline-none"
                        readOnly
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
                        value={editForm.modeOfPaymentId}
                        onChange={handleEditInputChange}
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
                    
                    {/* Empty column for spacing */}
                    <div></div>
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
                        value={editForm.amount}
                        onChange={handleEditInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    {/* Details */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Details
                      </label>
                      <input
                        type="text"
                        name="details"
                        value={editForm.details}
                        onChange={handleEditInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
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
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Credit Card Company */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                  
                  {/* Online Company */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Online Company
                    </label>
                    <input
                      type="text"
                      name="onlineCompanyName"
                      value={editForm.onlineCompanyName}
                      onChange={handleEditInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('view');
                        setEditingAdvance(null);
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {loading ? 'Updating...' : 'Update Advance'}
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
                  {/* Search Form */}
                  <form onSubmit={handleSearch} className="mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Enter search term..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <input
                          type="date"
                          value={searchDate}
                          onChange={(e) => setSearchDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <select
                          value={searchType}
                          onChange={(e) => setSearchType(e.target.value as 'all' | 'reservation' | 'guest' | 'receipt')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Fields</option>
                          <option value="reservation">Reservation No</option>
                          <option value="guest">Guest Name</option>
                          <option value="receipt">Receipt No</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Search
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Clear
                      </button>
                    </div>
                  </form>
                  
                  {advancesLoading ? (
                    <div className="flex justify-center items-center h-48">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const indexOfLastRecord = currentPage * recordsPerPage;
                        const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
                        const currentAdvances = advances.slice(indexOfFirstRecord, indexOfLastRecord);
                        const totalPages = Math.ceil(advances.length / recordsPerPage);
                        const totalAdvances = advances.length;
                        
                        return (
                          <>
                            <div className="overflow-x-auto rounded-lg shadow">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-blue-500 to-indigo-600">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Receipt No</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Guest Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Reservation No</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Bill No</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Room No</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Payment Mode</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {currentAdvances.length > 0 ? (
                                    currentAdvances.map((advance: Advance, index) => (
                                      <tr key={advance.advanceId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{advance.receiptNo}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{advance.date?.split('T')[0] || 'N/A'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{advance.guestName}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{advance.reservationNo || 'N/A'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{advance.billNo || 'N/A'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                          {advance.folioNo ? getRoomNoByFolio(advance.folioNo) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">₹{advance.amount?.toFixed(2) || '0.00'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                          {advance.modeOfPaymentName || advance.modeOfPaymentId || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                          <div className="flex space-x-2">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                console.log('Editing advance:', advance);
                                                handleEditAdvance(advance);
                                              }}
                                              className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (advance.receiptNo) {
                                                  console.log('Deleting advance with ID:', advance.advanceId);
                                                  handleDeleteAdvance(advance.receiptNo);
                                                } else {
                                                  console.error('Cannot delete advance: No receiptNo found', advance);
                                                  showNotification('Cannot delete advance: Invalid data', false);
                                                }
                                              }}
                                              className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td className="px-4 py-6 text-center text-sm text-gray-700" colSpan={9}>
                                        <div className="flex flex-col items-center justify-center py-8">
                                          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                          </svg>
                                          <p className="text-gray-500 text-base">
                                            {searchTerm ? 'No advances found matching your search criteria.' : 'No advances found.'}
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                            {/* Pagination */}
                            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                              <div className="flex flex-1 justify-between sm:hidden">
                                <button
                                  onClick={() => paginate(currentPage - 1)}
                                  disabled={currentPage === 1}
                                  className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  Previous
                                </button>
                                <button
                                  onClick={() => paginate(currentPage + 1)}
                                  disabled={currentPage === totalPages}
                                  className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  Next
                                </button>
                              </div>
                              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{indexOfFirstRecord + 1}</span> to{' '}
                                    <span className="font-medium">{Math.min(indexOfLastRecord, totalAdvances)}</span> of{' '}
                                    <span className="font-medium">{totalAdvances}</span> results
                                  </p>
                                </div>
                                <div>
                                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                      onClick={() => paginate(currentPage - 1)}
                                      disabled={currentPage === 1}
                                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                      <span className="sr-only">Previous</span>
                                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                    
                                    {/* Page numbers */}
                                    {[...Array(totalPages)].map((_, index) => {
                                      const pageNumber = index + 1;
                                      // Show first, last, current, and nearby pages
                                      if (
                                        pageNumber === 1 ||
                                        pageNumber === totalPages ||
                                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                                      ) {
                                        return (
                                          <button
                                            key={pageNumber}
                                            onClick={() => paginate(pageNumber)}
                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                              currentPage === pageNumber
                                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                            }`}
                                          >
                                            {pageNumber}
                                          </button>
                                        );
                                      }
                                      
                                      // Show ellipsis for skipped pages
                                      if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                                        return (
                                          <span
                                            key={pageNumber}
                                            className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                                          >
                                            ...
                                          </span>
                                        );
                                      }
                                      
                                      return null;
                                    })}
                                    
                                    <button
                                      onClick={() => paginate(currentPage + 1)}
                                      disabled={currentPage === totalPages}
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
                        );
                      })()}
                    </>
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
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          name="billNo"
                          value={reprintData.billNo}
                          onChange={handleReprintInputChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => {
                            fetchAvailableBills();
                            setShowBillsHelp(true);
                          }}
                          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                          title="Select from available bills"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        </button>
                      </div>
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
                
                {/* Bills Help Modal */}
                {showBillsHelp && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
                      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Select Bill to Reprint</h3>
                        <button
                          onClick={() => setShowBillsHelp(false)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </button>
                      </div>
                      <div className="p-4 overflow-y-auto max-h-[60vh]">
                        {billsLoading ? (
                          <div className="flex justify-center items-center h-48">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                          </div>
                        ) : (
                          <>
                            {availableBills.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Number</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Date</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {availableBills.map((bill, index) => (
                                      <tr key={bill.billNo} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{bill.billNo}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{bill.guestName}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{bill.generatedAt ? new Date(bill.generatedAt).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">₹{bill.totalAmount?.toFixed(2) || '0.00'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                          <button
                                            onClick={() => {
                                              setReprintData({ billNo: bill.billNo });
                                              setShowBillsHelp(false);
                                            }}
                                            className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                          >
                                            Select
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No bills found</h3>
                                <p className="mt-1 text-sm text-gray-500">There are no available bills to reprint.</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="p-4 border-t border-gray-200 flex justify-end">
                        <button
                          onClick={() => setShowBillsHelp(false)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {activeTab === 'expenses' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Hotel Expenses Entry</h2>
                </div>
                <div className="p-6">
                  <HotelExpenseEntry />
                </div>
              </>
            )}
            {activeTab === 'settlement' && (
    <>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Settlement Entry</h2>
      </div>
      <form onSubmit={handleSettlementEntry} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bill Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bill Number
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                name="billNo"
                value={settlementData.billNo}
                onChange={handleSettlementInputChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={() => {
                  fetchAvailableSettlementBills();
                  setShowSettlementBillsHelp(true);
                }}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                title="Select from available bills"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </button>
            </div>
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
              readOnly
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
        {/* Refund Information */}
        {settlementData.isRefund && settlementData.refundAmount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-yellow-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-sm font-medium text-yellow-800">Refund Required</h3>
            </div>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Advance amount exceeds charges by ₹{settlementData.refundAmount.toFixed(2)}. A refund voucher will be generated.</p>
            </div>
          </div>
        )}
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
              rows={3}
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
      
      {/* Bills Help Modal for Settlement */}
      {showSettlementBillsHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Select Bill for Settlement</h3>
              <button
                onClick={() => setShowSettlementBillsHelp(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {settlementBillsLoading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <>
                  {availableSettlementBills.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Number</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advance Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Due</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {availableSettlementBills.map((bill, index) => {
                            const totalAmount = bill.totalAmount || 0;
                            const advanceAmount = bill.advanceAmount || 0;
                            const amountDue = Math.max(0, totalAmount - advanceAmount);
                            const isRefund = advanceAmount > totalAmount;
                            const refundAmount = isRefund ? advanceAmount - totalAmount : 0;
                            
                            return (
                              <tr key={bill.billNo} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">{bill.billNo}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{bill.guestName}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">₹{totalAmount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">₹{advanceAmount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                  {isRefund ? (
                                    <span className="text-red-600">Refund: ₹{refundAmount.toFixed(2)}</span>
                                  ) : (
                                    `₹${amountDue.toFixed(2)}`
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  <button
                                    onClick={() => {
                                      setSettlementData(prev => ({
                                        ...prev,
                                        billNo: bill.billNo,
                                        guestName: bill.guestName,
                                        amount: amountDue,
                                        isRefund: isRefund,
                                        refundAmount: refundAmount
                                      }));
                                      setShowSettlementBillsHelp(false);
                                    }}
                                    className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                  >
                                    Select
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No bills found</h3>
                      <p className="mt-1 text-sm text-gray-500">There are no available bills for settlement.</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowSettlementBillsHelp(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )}
            {activeTab === 'sales' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Sales Receipts</h2>
                </div>
                <div className="p-6">
                  <SalesReceipts />
                </div>
              </>
            )}
            {activeTab === 'split' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Split Bill</h2>
                </div>
                <div className="p-6">
                  <SplitBill 
                    onSplitComplete={() => {
                      showNotification('Bill split successfully!', true);
                    }}
                  />
                </div>
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