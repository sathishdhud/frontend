import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import { Advance, CheckIn, PaymentMode, Room, Reservation, Expense } from '../types/api';
import { advanceApi, masterDataApi, checkInApi, transactionApi, billApi, roomApi, reservationApi } from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Define PaymentFormData interface
interface PaymentFormData {
  paymentAmount: number;
  modeOfPaymentId: string;
  paymentNotes: string;
}

const BillGeneration: React.FC = () => {
  const location = useLocation();
  // Tab state - added 'room' tab
  const [activeTab, setActiveTab] = useState<'reservation' | 'folio' | 'room'>('reservation');
  
  // Form state
  const [formData, setFormData] = useState({
    reservationNo: '',
    folioNo: '',
    roomNo: '', // Added roomNo field
  });

  // Bill data state
  const [billData, setBillData] = useState<any>(null);
  const [billTransactions, setBillTransactions] = useState<any[]>([]);
  const [billAdvances, setBillAdvances] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [relatedBills, setRelatedBills] = useState<any[]>([]);
  const [reservationData, setReservationData] = useState<Reservation | null>(null);
  
  // Payment state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    paymentAmount: 0,
    modeOfPaymentId: 'CASH',
    paymentNotes: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [showRelatedBills, setShowRelatedBills] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  // Check-ins modal state
  const [checkInsData, setCheckInsData] = useState<CheckIn[]>([]);
  const [showCheckInsModal, setShowCheckInsModal] = useState(false);
  
  // Ref for print content
  const billContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPaymentModes();
    fetchRooms();
    
    // Check for folioNo in URL query parameters
    const queryParams = new URLSearchParams(location.search);
    const folioNo = queryParams.get('folioNo');
    
    if (folioNo) {
      // Set form data and active tab
      setFormData(prev => ({
        ...prev,
        folioNo: folioNo
      }));
      setActiveTab('folio');
      
      // Automatically generate bill for this folio
      setTimeout(() => {
        generateBillByFolio(folioNo);
      }, 100);
    }
  }, [location.search]);

  const fetchPaymentModes = async () => {
    try {
      const response = await masterDataApi.getPaymentModes();
      if (response.data.success) {
        setPaymentModes(response.data.data);
        // Set default payment mode if there's only one option
        if (response.data.data.length === 1) {
          setPaymentForm(prev => ({
            ...prev,
            modeOfPaymentId: response.data.data[0].id
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment modes:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await roomApi.getRooms();
      if (response.data.success) {
        setRooms(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  // Function to find reservation by reservation number
  const findReservationByNumber = async (reservationNo: string): Promise<Reservation | null> => {
    try {
      console.log('Searching for reservation with reservation number:', reservationNo);
      
      // Try search with the exact reservation number
      const searchRes = await reservationApi.searchReservations(reservationNo);
      console.log('Reservation search result:', searchRes.data);
      
      if (searchRes.data.success && searchRes.data.data.length > 0) {
        const exactMatch = searchRes.data.data.find((r: Reservation) => r.reservationNo === reservationNo);
        if (exactMatch) {
          console.log('Found exact match in reservation search:', exactMatch);
          return exactMatch;
        }
      }
      
      // Try getting all reservations and filtering
      const allReservationsRes = await reservationApi.getReservations();
      console.log('All reservations result:', allReservationsRes.data);
      
      if (allReservationsRes.data.success && allReservationsRes.data.data && allReservationsRes.data.data.length > 0) {
        const exactMatch = allReservationsRes.data.data.find((r: Reservation) => r.reservationNo === reservationNo);
        if (exactMatch) {
          console.log('Found exact match in all reservations:', exactMatch);
          return exactMatch;
        }
      }
      
      console.log('Reservation not found');
      return null;
    } catch (error) {
      console.error('Error searching for reservation:', error);
      return null;
    }
  };

  // Function to fetch advances by reservation number
  const fetchAdvancesByReservation = async (reservationNo: string): Promise<Advance[]> => {
    try {
      console.log(`Fetching advances for reservation: ${reservationNo}`);
      
      const response = await advanceApi.getAdvancesByReservation(reservationNo);
      console.log('Advances by reservation response:', response);
      
      if (response.data.success && response.data.data) {
        console.log(`Found ${response.data.data.length} advances for reservation ${reservationNo}`);
        return response.data.data;
      } else {
        console.warn(`No advances found for reservation ${reservationNo} or API returned unsuccessful response`);
        return [];
      }
    } catch (error) {
      console.error(`Error fetching advances for reservation ${reservationNo}:`, error);
      return [];
    }
  };

  // Function to fetch expenses by folio number
  const fetchExpensesByFolio = async (folioNo: string): Promise<Expense[]> => {
    // Validate folioNo parameter
    if (!folioNo) {
      console.warn('folioNo is undefined or empty');
      return [];
    }
    
    try {
      console.log(`Fetching expenses for folio: ${folioNo}`);
      
      // Get all expenses
      const response = await transactionApi.getExpenses();
      console.log('All expenses response:', response);
      
      if (response.data.success && response.data.data) {
        // Filter expenses by folio number in narration
        const filteredExpenses = response.data.data.filter((expense: Expense) => 
          expense.narration && expense.narration.includes(folioNo)
        );
        console.log(`Found ${filteredExpenses.length} expenses for folio ${folioNo}`);
        return filteredExpenses;
      } else {
        console.warn(`No expenses found or API returned unsuccessful response`);
        return [];
      }
    } catch (error) {
      console.error(`Error fetching expenses for folio ${folioNo}:`, error);
      return [];
    }
  };

  // Helper function to find check-in by folio number with enhanced search
  const findCheckInByFolio = async (folioNo: string): Promise<CheckIn | null> => {
    try {
      console.log('Searching for check-in with folio number:', folioNo);
      
      // Method 1: Try direct search with the exact folio number
      console.log('Method 1: Direct search with exact folio number');
      const searchRes = await checkInApi.searchCheckIns(folioNo);
      console.log('Direct search result:', searchRes.data);
      
      if (searchRes.data.success && searchRes.data.data.length > 0) {
        const exactMatch = searchRes.data.data.find((c: CheckIn) => c.folioNo === folioNo);
        if (exactMatch) {
          console.log('Found exact match in direct search:', exactMatch);
          return exactMatch;
        }
        // Log all found folio numbers for debugging
        const foundFolios = searchRes.data.data.map((c: CheckIn) => c.folioNo).join(', ');
        console.log('Folio numbers found in direct search:', foundFolios);
      }
      
      // Method 2: Try search with partial folio number (remove F prefix)
      if (folioNo.startsWith('F') && folioNo.length > 1) {
        console.log('Method 2: Search with partial folio number (remove F prefix)');
        const partialFolio = folioNo.substring(1);
        const partialSearchRes = await checkInApi.searchCheckIns(partialFolio);
        console.log('Partial search result:', partialSearchRes.data);
        
        if (partialSearchRes.data.success && partialSearchRes.data.data.length > 0) {
          const exactMatch = partialSearchRes.data.data.find((c: CheckIn) => c.folioNo === folioNo);
          if (exactMatch) {
            console.log('Found exact match in partial search:', exactMatch);
            return exactMatch;
          }
          // Log all found folio numbers for debugging
          const foundFolios = partialSearchRes.data.data.map((c: CheckIn) => c.folioNo).join(', ');
          console.log('Folio numbers found in partial search:', foundFolios);
        }
      }
      
      // Method 3: Try getting all in-house guests
      console.log('Method 3: Getting all in-house guests');
      const inHouseRes = await checkInApi.getInHouseGuests();
      console.log('In-house guests result:', inHouseRes.data);
      
      if (inHouseRes.data.success) {
        const exactMatch = inHouseRes.data.data.find((c: CheckIn) => c.folioNo === folioNo);
        if (exactMatch) {
          console.log('Found exact match in in-house guests:', exactMatch);
          return exactMatch;
        }
        
        // Try partial match in in-house guests
        if (folioNo.startsWith('F') && folioNo.length > 1) {
          const partialFolio = folioNo.substring(1);
          const partialMatch = inHouseRes.data.data.find((c: CheckIn) => 
            c.folioNo && c.folioNo.includes(partialFolio)
          );
          if (partialMatch) {
            console.log('Found partial match in in-house guests:', partialMatch);
            return partialMatch;
          }
        }
        
        // Log all in-house folio numbers for debugging
        const inHouseFolios = inHouseRes.data.data.map((c: CheckIn) => c.folioNo).join(', ');
        console.log('In-house folio numbers:', inHouseFolios);
      }
      
      // Method 4: Try case-insensitive search in direct search results
      if (searchRes.data.success && searchRes.data.data.length > 0) {
        console.log('Method 4: Case-insensitive search in direct search results');
        const caseInsensitiveMatch = searchRes.data.data.find((c: CheckIn) => 
          c.folioNo && c.folioNo.toLowerCase() === folioNo.toLowerCase()
        );
        if (caseInsensitiveMatch) {
          console.log('Found case-insensitive match in direct search:', caseInsensitiveMatch);
          return caseInsensitiveMatch;
        }
      }
      
      // Method 5: Try case-insensitive search in in-house guests
      if (inHouseRes.data.success) {
        console.log('Method 5: Case-insensitive search in in-house guests');
        const caseInsensitiveMatch = inHouseRes.data.data.find((c: CheckIn) => 
          c.folioNo && c.folioNo.toLowerCase() === folioNo.toLowerCase()
        );
        if (caseInsensitiveMatch) {
          console.log('Found case-insensitive match in in-house guests:', caseInsensitiveMatch);
          return caseInsensitiveMatch;
        }
      }
      
      // Method 6: Try search with empty string to get all check-ins
      console.log('Method 6: Search with empty string to get all check-ins');
      const allCheckInsRes = await checkInApi.searchCheckIns('');
      console.log('All check-ins result:', allCheckInsRes.data);
      
      if (allCheckInsRes.data.success && allCheckInsRes.data.data && allCheckInsRes.data.data.length > 0) {
        const exactMatch = allCheckInsRes.data.data.find((c: CheckIn) => c.folioNo === folioNo);
        if (exactMatch) {
          console.log('Found exact match in all check-ins search:', exactMatch);
          return exactMatch;
        }
        
        // Try case-insensitive search in all check-ins
        const caseInsensitiveMatch = allCheckInsRes.data.data.find((c: CheckIn) => 
          c.folioNo && c.folioNo.toLowerCase() === folioNo.toLowerCase()
        );
        if (caseInsensitiveMatch) {
          console.log('Found case-insensitive match in all check-ins search:', caseInsensitiveMatch);
          return caseInsensitiveMatch;
        }
        
        // Try partial match in all check-ins
        if (folioNo.startsWith('F') && folioNo.length > 1) {
          const partialFolio = folioNo.substring(1);
          const partialMatch = allCheckInsRes.data.data.find((c: CheckIn) => 
            c.folioNo && c.folioNo.includes(partialFolio)
          );
          if (partialMatch) {
            console.log('Found partial match in all check-ins search:', partialMatch);
            return partialMatch;
          }
        }
        
        // Log all check-in folio numbers for debugging
        const allCheckInFolios = allCheckInsRes.data.data.map((c: CheckIn) => c.folioNo).join(', ');
        console.log('All check-in folio numbers:', allCheckInFolios);
      }
      
      console.log('Check-in not found with any search method');
      return null;
    } catch (error) {
      console.error('Error searching for check-in:', error);
      return null;
    }
  };

  // Function to find check-in by reservation number
  const findCheckInByReservation = async (reservationNo: string): Promise<CheckIn | null> => {
    try {
      console.log('Searching for check-in with reservation number:', reservationNo);
      
      // Try to find check-ins with this reservation number
      const checkInsRes = await checkInApi.searchCheckIns(reservationNo);
      console.log('Check-ins by reservation response:', checkInsRes.data);
      
      if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
        const checkIn = checkInsRes.data.data[0]; // Take the first match
        console.log('Found check-in for reservation:', checkIn);
        return checkIn;
      }
      
      // If not found by reservation number, try to get all in-house guests and filter by reservation number
      const inHouseRes = await checkInApi.getInHouseGuests();
      console.log('In-house guests response:', inHouseRes.data);
      
      if (inHouseRes.data.success) {
        const checkIn = inHouseRes.data.data.find((c: CheckIn) => c.reservationNo === reservationNo);
        if (checkIn) {
          console.log('Found check-in in in-house guests:', checkIn);
          return checkIn;
        }
      }
      
      console.log('Check-in not found for reservation:', reservationNo);
      return null;
    } catch (error) {
      console.error('Error searching for check-in by reservation:', error);
      return null;
    }
  };

  // Function to find check-in by room number
  const findCheckInByRoom = async (roomNo: string): Promise<CheckIn | null> => {
    try {
      console.log('Searching for check-in with room number:', roomNo);
      
      // First, find the room by room number
      const roomResponse = await roomApi.getRooms();
      if (roomResponse.data.success) {
        const room = roomResponse.data.data.find((r: Room) => r.roomNo === roomNo);
        if (room) {
          console.log('Found room:', room);
          
          // Now find check-in by room ID
          const checkInResponse = await checkInApi.getCheckInByRoom(room.roomId);
          if (checkInResponse.data.success) {
            console.log('Found check-in for room:', checkInResponse.data.data);
            return checkInResponse.data.data;
          }
        }
      }
      
      console.log('Check-in not found for room:', roomNo);
      return null;
    } catch (error) {
      console.error('Error searching for check-in by room:', error);
      return null;
    }
  };

  // Function to generate bill by reservation
  const generateBillByReservation = async (reservationNo: string) => {
    if (!reservationNo) {
      alert('Please enter a reservation number.');
      return;
    }
    
    setLoading(true);
    try {
      // First, verify that the reservation exists
      let reservation = await findReservationByNumber(reservationNo);
      
      if (!reservation) {
        alert(`Reservation not found for reservation number: ${reservationNo}`);
        setLoading(false);
        return;
      }
      
      setReservationData(reservation);
      
      // Extract financial year from current date (e.g., 24-25 for 2024-2025)
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const nextYear = currentYear + 1;
      const financialYear = `${currentYear.toString().slice(-2)}-${nextYear.toString().slice(-2)}`;
      
      // Try to find check-in for this reservation
      let checkInData: CheckIn | null = null;
      try {
        checkInData = await findCheckInByReservation(reservationNo);
      } catch (error) {
        console.error('Error finding check-in for reservation:', error);
      }
      
      // Fetch advances by reservation number
      console.log(`Fetching advances for reservation: ${reservationNo}`);
      const billAdvancesData = await fetchAdvancesByReservation(reservationNo);
      
      // Calculate room charges from reservation data
      const roomCharges = reservation.rate || 0;
      
      // Calculate advance amount
      const advanceAmount = billAdvancesData.reduce((sum, advance) => {
        console.log(`Adding advance amount: ${advance.amount}, receipt: ${advance.receiptNo}`);
        return sum + (advance.amount || 0);
      }, 0);
      
      console.log(`Total advance amount calculated: ${advanceAmount}`);
      
      // For a reservation-based bill, we don't have transactions yet, so additional charges are 0
      const additionalCharges = 0;
      
      // Calculate subtotal (room charges + additional charges)
      const subtotal = roomCharges + additionalCharges;
      
      // Calculate balance (subtotal - advance paid)
      const balanceAmount = Math.max(0, subtotal - advanceAmount);
      
      console.log(`Bill calculation - Room: ${roomCharges}, Advance: ${advanceAmount}, Balance: ${balanceAmount}`);
      
      // Generate a temporary bill number for display
      const tempBillNo = `B-TEMP-${reservationNo}-${financialYear}`;
      
      // Set the bill data
      setBillData({
        billNo: tempBillNo,
        reservationNo: reservation.reservationNo,
        folioNo: checkInData?.folioNo || '',
        guestName: reservation.guestName,
        checkInDate: reservation.arrivalDate ? new Date(reservation.arrivalDate).toLocaleDateString() : 'N/A',
        checkOutDate: reservation.departureDate ? new Date(reservation.departureDate).toLocaleDateString() : 'N/A',
        roomCharges: roomCharges,
        additionalCharges: additionalCharges,
        subtotal: subtotal,
        advanceAmount: advanceAmount,
        balanceAmount: balanceAmount,
        paidAmount: 0,
        generatedAt: new Date().toLocaleString(),
        isSplitBill: false,
        settlementStatus: 'Pending',
        paymentNotes: '',
      });
      
      // Set bill transactions (empty for reservation-based bill)
      setBillTransactions([]);
      
      // Set bill advances
      setBillAdvances(billAdvancesData);
      
      // Reset payment form with proper balance amount
      setPaymentForm({
        paymentAmount: balanceAmount,
        modeOfPaymentId: 'CASH',
        paymentNotes: ''
      });
      setShowPaymentForm(false);
    } catch (error: any) {
      console.error('Failed to generate bill by reservation:', error);
      let errorMessage = 'Failed to generate bill. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      }
      alert(`Failed to generate bill: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to generate bill by folio
  const generateBillByFolio = async (folioNo: string) => {
    if (!folioNo) {
      alert('Please enter a folio number.');
      return;
    }
    
    setLoading(true);
    try {
      // First, verify that the check-in exists using our enhanced search
      let checkInData = await findCheckInByFolio(folioNo);
      
      // If check-in not found, we'll still try to generate the bill but warn the user
      if (!checkInData) {
        const confirmGenerate = window.confirm(
          `Check-in not found for folio number: ${folioNo} using our search methods. ` +
          `This might be due to a search discrepancy. Do you want to proceed with bill generation anyway?`
        );
        
        if (!confirmGenerate) {
          // Get all in-house guests to show what folio numbers exist
          try {
            const inHouseRes = await checkInApi.getInHouseGuests();
            if (inHouseRes.data.success && inHouseRes.data.data.length > 0) {
              const folioNumbers = inHouseRes.data.data.map((c: CheckIn) => c.folioNo).join(', ');
              alert(`Current folio numbers in the system:\n${folioNumbers}`);
            }
          } catch (error) {
            console.error('Error fetching in-house guests for error display:', error);
          }
          setLoading(false);
          return;
        }
      }
      
      // Extract financial year from current date (e.g., 24-25 for 2024-2025)
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const nextYear = currentYear + 1;
      const financialYear = `${currentYear.toString().slice(-2)}-${nextYear.toString().slice(-2)}`;
      
      // First, try to get existing bill data by folio number
      console.log('Calling bill by folio API with folioNo:', folioNo);
      let response;
      try {
        const billResponse = await billApi.getBillByFolio(folioNo);
        console.log('Bill by folio response:', billResponse.data);
        
        if (billResponse.data.success) {
          // Use existing bill data
          response = billResponse;
        } else {
          // Generate new bill if not found
          console.log('Calling bill generation API with folioNo:', folioNo, 'and financialYear:', financialYear);
          response = await billApi.generateBill(folioNo, financialYear);
          console.log('Bill generation response:', response.data);
        }
      } catch (error) {
        // If fetching bill by folio fails, try to generate a new bill
        console.log('Calling bill generation API with folioNo:', folioNo, 'and financialYear:', financialYear);
        response = await billApi.generateBill(folioNo, financialYear);
        console.log('Bill generation response:', response.data);
      }
      
      if (response.data.success) {
        const billData = response.data.data;
        
        // Find room details
        let roomNo = billData.roomNo || '';
        let roomId = billData.roomId || '';
        
        if (!roomNo && roomId) {
          const room = rooms.find(r => r.roomId === roomId);
          if (room) {
            roomNo = room.roomNo;
          }
        } else if (!roomId && billData.folioNo && checkInData) {
          // Use the checkInData we already found
          if (checkInData && checkInData.roomId) {
            roomId = checkInData.roomId;
            const room = rooms.find(r => r.roomId === checkInData.roomId);
            if (room) {
              roomNo = room.roomNo;
            }
          }
        }
        
        // Generate voucher number if not provided
        const voucherNo = billData.voucherNo || `V-${folioNo}-${financialYear}`;
        
        // Get room charges directly from the API response
        let roomCharges = billData.roomCharges || 0;
        
        // If not available, fallback to totalAmount
        if (!roomCharges) {
          roomCharges = billData.totalAmount || 0;
        }
        
        // Use the rate from the check-in data we already found
        if (!roomCharges && checkInData) {
          roomCharges = checkInData.rate || 0;
        }
        
        // If still no room charges, try to get from reservation
        if (!roomCharges && billData.reservationNo) {
          const reservationsRes = await reservationApi.getReservations();
          if (reservationsRes.data.success) {
            const reservation = reservationsRes.data.data.find((r: Reservation) => r.reservationNo === billData.reservationNo);
            if (reservation) {
              roomCharges = reservation.rate || 0;
            }
          }
        }
        
        // Set bill transactions from the response
        const billTransactions = billData.transactions || [];
        
        // Fetch advances by reservation number if available
        let billAdvancesData: Advance[] = [];
        if (billData.reservationNo) {
          console.log(`Fetching advances for reservation: ${billData.reservationNo}`);
          billAdvancesData = await fetchAdvancesByReservation(billData.reservationNo);
        }
        
        // Also fetch advances by folio number if available
        if (folioNo) {
          try {
            console.log(`Fetching advances for folio: ${folioNo}`);
            const folioAdvancesResponse = await advanceApi.getAdvancesByFolio(folioNo);
            if (folioAdvancesResponse.data.success && folioAdvancesResponse.data.data) {
              console.log(`Found ${folioAdvancesResponse.data.data.length} advances by folio`);
              // Combine with reservation advances, removing duplicates
              const combinedAdvances = [...billAdvancesData, ...folioAdvancesResponse.data.data];
              // Remove duplicates based on receiptNo
              billAdvancesData = combinedAdvances.filter((advance, index, self) => 
                index === self.findIndex(a => a.receiptNo === advance.receiptNo)
              );
            }
          } catch (error) {
            console.error('Error fetching advances by folio:', error);
          }
        }
        
        // Also fetch advances by bill number if available
        if (billData.billNo) {
          try {
            console.log(`Fetching advances for bill: ${billData.billNo}`);
            const billAdvancesResponse = await advanceApi.getAdvancesByBill(billData.billNo);
            if (billAdvancesResponse.data.success && billAdvancesResponse.data.data) {
              console.log(`Found ${billAdvancesResponse.data.data.length} advances by bill`);
              // Combine with existing advances, removing duplicates
              const combinedAdvances = [...billAdvancesData, ...billAdvancesResponse.data.data];
              // Remove duplicates based on receiptNo
              billAdvancesData = combinedAdvances.filter((advance, index, self) => 
                index === self.findIndex(a => a.receiptNo === advance.receiptNo)
              );
            }
          } catch (error) {
            console.error('Error fetching advances by bill:', error);
          }
        }
        
        // Fetch expenses for this folio
        const expensesData = await fetchExpensesByFolio(folioNo);
        setExpenses(expensesData);
        
        // Calculate advances and transactions
        const advanceAmount = billAdvancesData.reduce((sum, advance) => {
          console.log(`Adding advance amount: ${advance.amount}, receipt: ${advance.receiptNo}`);
          return sum + (advance.amount || 0);
        }, 0);
        const paidAmount = billData.paidAmount || 0;
        
        // Calculate additional charges from transactions (excluding room charges which are already in roomCharges)
        const additionalCharges = billTransactions
          .filter((transaction: any) => transaction.accHeadId !== 'ROOM_CHARGES') // Exclude room charges
          .reduce((sum: number, transaction: any) => sum + (transaction.amount || 0), 0);
        
        // Calculate expense charges from expenses
        const expenseCharges = expensesData.reduce((sum: number, expense: Expense) => sum + (expense.amount || 0), 0);
        
        // Calculate subtotal (room charges + additional charges + expense charges)
        const subtotal = roomCharges + additionalCharges + expenseCharges;
        
        // Calculate balance (subtotal - advance paid - paid amount)
        const balanceAmount = Math.max(0, subtotal - advanceAmount - paidAmount);
        
        console.log(`Bill calculation - Room: ${roomCharges}, Additional: ${additionalCharges}, Subtotal: ${subtotal}, Advance: ${advanceAmount}, Paid: ${paidAmount}, Balance: ${balanceAmount}`);
        
        // Set the bill data
        setBillData({
          billNo: billData.billNo || '',
          folioNo: billData.folioNo || folioNo,
          voucherNo: voucherNo,
          roomId: roomId,
          roomNo: roomNo,
          guestName: billData.guestName || checkInData?.guestName || 'Unknown Guest',
          checkInDate: billData.checkInDate ? new Date(billData.checkInDate).toLocaleDateString() : 
                      (checkInData?.arrivalDate ? new Date(checkInData.arrivalDate).toLocaleDateString() : 'Unknown'),
          checkOutDate: billData.checkOutDate ? new Date(billData.checkOutDate).toLocaleDateString() : new Date().toLocaleDateString(),
          roomCharges: roomCharges,
          additionalCharges: additionalCharges,
          expenseCharges: expenseCharges, // Add expense charges to bill data
          subtotal: subtotal,
          advanceAmount: advanceAmount,
          balanceAmount: balanceAmount,
          paidAmount: paidAmount,
          generatedAt: billData.generatedAt ? new Date(billData.generatedAt).toLocaleString() : '',
          isSplitBill: billData.isSplitBill || false,
          settlementStatus: billData.settlementStatus || '',
          settlementDate: billData.settlementDate ? new Date(billData.settlementDate).toLocaleString() : '',
          paymentNotes: billData.paymentNotes || '',
          reservationNo: billData.reservationNo || checkInData?.reservationNo || '',
        });
        
        // Set bill transactions if available
        setBillTransactions(billTransactions);
        
        // Set bill advances
        setBillAdvances(billAdvancesData);
        
        // Reset payment form with proper balance amount
        setPaymentForm({
          paymentAmount: balanceAmount,
          modeOfPaymentId: 'CASH',
          paymentNotes: ''
        });
        setShowPaymentForm(false);
      } else {
        console.error('Bill generation API returned failure:', response.data);
        alert(`Failed to generate bill: ${response.data.message}`);
      }
    } catch (error: any) {
      console.error('Failed to generate bill:', error);
      // Enhanced error handling to provide more specific information
      let errorMessage = 'Failed to generate bill. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        // Check if it's a check-in not found error
        if (errorMessage.includes('Check-in not found')) {
          errorMessage += `. Please verify the folio number "${folioNo}" exists and the guest has been checked in.`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      alert(`Failed to generate bill: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to generate bill by room number
  const generateBillByRoom = async (roomNo: string) => {
    if (!roomNo) {
      alert('Please enter a room number.');
      return;
    }
    
    setLoading(true);
    try {
      // First, find the check-in for this room
      let checkInData = await findCheckInByRoom(roomNo);
      
      if (!checkInData) {
        alert(`No check-in found for room number: ${roomNo}`);
        setLoading(false);
        return;
      }
      
      // Use the folio number from the check-in to generate the bill
      const folioNo = checkInData.folioNo;
      if (!folioNo) {
        alert(`No folio number found for room: ${roomNo}`);
        setLoading(false);
        return;
      }
      
      // Now generate the bill using the existing folio-based function
      await generateBillByFolio(folioNo);
    } catch (error: any) {
      console.error('Failed to generate bill by room:', error);
      let errorMessage = 'Failed to generate bill. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      }
      alert(`Failed to generate bill: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to update bill
  const updateBill = async () => {
    if (!billData) {
      alert('No bill data to update.');
      return;
    }
    
    setLoading(true);
    try {
      if (activeTab === 'reservation') {
        // For reservation-based bills, we'll simulate the process
        alert('In a complete implementation, this would:\n' +
              '1. Check for existing check-in\n' +
              '2. Create check-in if needed\n' +
              '3. Generate proper bill\n' +
              '4. Update bill with current data\n\n' +
              'For now, bill data is saved in the current session.');
        
        alert('Reservation-based bill data saved successfully!');
      } else {
        // For folio-based bills
        const billNo = billData.billNo;
        
        // Call the bill update API
        const response = await billApi.updateBill(billNo, {
          guestName: billData.guestName,
          totalAmount: billData.subtotal, // Use subtotal instead of totalAmount
          advanceAmount: billData.advanceAmount,
          paymentNotes: billData.paymentNotes || 'Bill generated and updated',
          advances: billAdvances // Include the actual advance records
        });
        
        if (response.data.success) {
          // After successful bill update, checkout the guest and update room status
          await handleCheckoutAndRoomStatusUpdate();
          
          alert('Bill updated successfully! Guest has been checked out and room status updated.');
        } else {
          alert(`Failed to update bill: ${response.data.message}`);
        }
      }
    } catch (error: any) {
      console.error('Failed to update bill:', error);
      alert(`Failed to update bill: ${error.response?.data?.message || error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch related bills
  const fetchRelatedBills = async (billNo: string) => {
    if (!billNo) {
      alert('No bill number provided.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await billApi.getRelatedBills(billNo);
      
      if (response.data.success) {
        setRelatedBills(response.data.data);
        setShowRelatedBills(true);
      } else {
        alert(`Failed to fetch related bills: ${response.data.message}`);
      }
    } catch (error: any) {
      console.error('Failed to fetch related bills:', error);
      alert(`Failed to fetch related bills: ${error.response?.data?.message || error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to download bill as PDF
  const downloadBillAsPDF = async () => {
    if (!billData) {
      alert('No bill data available.');
      return;
    }

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
      pdf.setFillColor(245, 245, 245);
      pdf.rect(tableStartX, currentY, tableWidth, rowHeight, 'F');
      pdf.text('Room Charges', tableStartX + 5, currentY + 7);
      pdf.text(`₹${billData.roomCharges?.toFixed(2) || '0.00'}`, tableStartX + tableWidth - 5, currentY + 7, { align: 'right' });
      currentY += rowHeight;
      
      // Add additional charges
      if (billTransactions.length > 0) {
        billTransactions.forEach((transaction: any, index: number) => {
          if (transaction.accHeadId !== 'ROOM_CHARGES') {
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
      
      // Add expense charges
      if (expenses.length > 0) {
        expenses.forEach((expense: Expense, index: number) => {
          const itemName = expense.narration || 'Expense';
          
          // Alternating row colors
          if (index % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(tableStartX, currentY, tableWidth, rowHeight, 'F');
          }
          
          pdf.text(itemName, tableStartX + 5, currentY + 7);
          pdf.text(`₹${expense.amount?.toFixed(2) || '0.00'}`, tableStartX + tableWidth - 5, currentY + 7, { align: 'right' });
          currentY += rowHeight;
          
          // Check if we need a new page
          if (currentY > pageHeight - 80) {
            pdf.addPage();
            currentY = margin;
          }
        });
      }
      
      // Add separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.line(tableStartX, currentY, tableStartX + tableWidth, currentY);
      currentY += 8;
      
      // Calculate totals
      const subtotal = billData.subtotal || 0;
      const advanceAmount = billAdvances.reduce((sum, advance) => sum + (advance.amount || 0), 0);
      const balanceAmount = Math.max(0, subtotal - advanceAmount);
      const paidAmount = billData.paidAmount || 0;
      
      // Add summary in a card-like format
      const summaryCardX = pageWidth - 100;
      const summaryCardY = currentY;
      const summaryCardWidth = 80;
      const summaryCardHeight = 40;
      
      pdf.setFillColor(245, 245, 245);
      pdf.rect(summaryCardX, summaryCardY, summaryCardWidth, summaryCardHeight, 'F');
      pdf.setDrawColor(220, 220, 220);
      pdf.rect(summaryCardX, summaryCardY, summaryCardWidth, summaryCardHeight);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(60, 60, 60);
      pdf.text('Subtotal:', summaryCardX + 5, summaryCardY + 12);
      pdf.text('Advance:', summaryCardX + 5, summaryCardY + 22);
      pdf.text('Balance:', summaryCardX + 5, summaryCardY + 32);
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(`₹${subtotal.toFixed(2)}`, summaryCardX + 40, summaryCardY + 12);
      pdf.text(`₹${advanceAmount.toFixed(2)}`, summaryCardX + 40, summaryCardY + 22);
      pdf.text(`₹${balanceAmount.toFixed(2)}`, summaryCardX + 40, summaryCardY + 32);
      
      // Total amount due with emphasis
      currentY += summaryCardHeight + 10;
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(40, 40, 40);
      pdf.text('Total Amount Due:', pageWidth - 100, currentY);
      pdf.text(`₹${balanceAmount.toFixed(2)}`, pageWidth - 20, currentY, { align: 'right' });
      currentY += 20;
      
      // Add advance payments table if any
      if (billAdvances.length > 0) {
        currentY += 5;
        pdf.setFontSize(16);
        pdf.setTextColor(40, 40, 40);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Advance Payments', margin, currentY);
        currentY += 12;
        
        // Advance payments table with modern styling
        const advanceTableStartX = margin;
        const advanceTableWidth = pageWidth - (margin * 2);
        
        // Table headers with background
        pdf.setFillColor(60, 60, 60);
        pdf.rect(advanceTableStartX, currentY, advanceTableWidth, rowHeight, 'F');
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('Date', advanceTableStartX + 5, currentY + 7);
        pdf.text('Receipt No', advanceTableStartX + 40, currentY + 7);
        pdf.text('Payment Mode', advanceTableStartX + 80, currentY + 7);
        pdf.text('Amount (₹)', advanceTableStartX + advanceTableWidth - 5, currentY + 7, { align: 'right' });
        
        currentY += rowHeight;
        
        // Advance payments content with alternating row colors
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(40, 40, 40);
        
        billAdvances.forEach((advance: any, index: number) => {
          const date = advance.date ? new Date(advance.date).toLocaleDateString() : 'N/A';
          
          // Alternating row colors
          if (index % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(advanceTableStartX, currentY, advanceTableWidth, rowHeight, 'F');
          }
          
          pdf.text(date, advanceTableStartX + 5, currentY + 7);
          pdf.text(advance.receiptNo || 'N/A', advanceTableStartX + 40, currentY + 7);
          pdf.text(advance.modeOfPaymentName || advance.modeOfPaymentId || 'N/A', advanceTableStartX + 80, currentY + 7);
          pdf.text(`₹${advance.amount?.toFixed(2) || '0.00'}`, advanceTableStartX + advanceTableWidth - 5, currentY + 7, { align: 'right' });
          currentY += rowHeight;
          
          // Check if we need a new page
          if (currentY > pageHeight - 80) {
            pdf.addPage();
            currentY = margin;
          }
        });
      }
      
      // Add payment information if available
      if (billData.paidAmount > 0) {
        currentY += 10;
        pdf.setFontSize(16);
        pdf.setTextColor(40, 40, 40);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Payment Information', margin, currentY);
        currentY += 12;
        
        // Payment information card
        const paymentCardX = margin;
        const paymentCardY = currentY;
        const paymentCardWidth = pageWidth - (margin * 2);
        const paymentCardHeight = 30;
        
        pdf.setFillColor(245, 245, 245);
        pdf.rect(paymentCardX, paymentCardY, paymentCardWidth, paymentCardHeight, 'F');
        pdf.setDrawColor(220, 220, 220);
        pdf.rect(paymentCardX, paymentCardY, paymentCardWidth, paymentCardHeight);
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(60, 60, 60);
        pdf.text('Payment Status:', paymentCardX + 5, paymentCardY + 12);
        pdf.text('Amount Paid:', paymentCardX + 5, paymentCardY + 22);
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(billData.settlementStatus || 'N/A', paymentCardX + 45, paymentCardY + 12);
        pdf.text(`₹${paidAmount.toFixed(2)}`, paymentCardX + 45, paymentCardY + 22);
        
        currentY += paymentCardHeight + 10;
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
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 100, 100);
      pdf.text('This is a computer generated invoice and does not require a signature', pageWidth / 2, currentY, { align: 'center' });
      
      // Add bill generation note
      currentY += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Bill Generated: ${billData.billNo || 'N/A'}`, pageWidth / 2, currentY, { align: 'center' });
      
      // Save the PDF
      const fileName = `Bill_${billData.billNo || 'unknown'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
      
      // After downloading the PDF, checkout the guest and update room status
      if (activeTab !== 'reservation') {
        await handleCheckoutAndRoomStatusUpdate();
        console.log('Checkout process completed after PDF download');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'reservation') {
      const reservationNo = formData.reservationNo.trim();
      
      if (!reservationNo) {
        alert('Please enter a reservation number.');
        return;
      }
      
      generateBillByReservation(reservationNo);
    } else if (activeTab === 'room') {
      const roomNo = formData.roomNo.trim();
      
      if (!roomNo) {
        alert('Please enter a room number.');
        return;
      }
      
      generateBillByRoom(roomNo);
    } else {
      let folioNo = formData.folioNo.trim();
      
      // Validate folio number format (should start with F followed by numbers and hyphens)
      if (!folioNo) {
        alert('Please enter a folio number.');
        return;
      }
      
      // Normalize folio number format
      // Ensure it starts with 'F' and has the correct format
      if (!/^F/i.test(folioNo)) {
        // If it doesn't start with F, add it
        folioNo = 'F' + folioNo;
      }
      
      // Ensure proper format (F followed by numbers and hyphens)
      if (!/^F[\d\-]+$/i.test(folioNo)) {
        alert('Please enter a valid folio number format (e.g., F11-25-26).');
        return;
      }
      
      // Convert to uppercase for consistency
      folioNo = folioNo.toUpperCase();
      
      generateBillByFolio(folioNo);
    }
  };

  const handleClear = () => {
    setFormData({ reservationNo: '', folioNo: '', roomNo: '' });
    setBillData(null);
    setBillTransactions([]);
    setBillAdvances([]);
    setRelatedBills([]);
    setReservationData(null);
    setShowRelatedBills(false);
    setShowPaymentForm(false);
  };

  // Handle payment form changes
  const handlePaymentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({
      ...prev,
      [name]: name === 'paymentAmount' ? parseFloat(value) || 0 : value
    }));
  };

  // Handle payment submission
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billData) {
      setPaymentError('No bill data available for payment.');
      return;
    }
    
    // Validate payment amount
    if (paymentForm.paymentAmount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }
    
    // Ensure payment amount doesn't exceed balance
    if (paymentForm.paymentAmount > billData.balanceAmount) {
      setPaymentError(`Payment amount cannot exceed balance amount of ₹${billData.balanceAmount.toFixed(2)}`);
      return;
    }
    
    setPaymentLoading(true);
    setPaymentError('');
    
    try {
      if (activeTab === 'reservation') {
        // For reservation-based bills, we need to find an existing check-in for this reservation
        // We won't create a new check-in to avoid room availability issues
        
        console.log('Processing payment for reservation:', billData.reservationNo);
        
        // Try to find an existing check-in for this reservation
        const checkInData = await findCheckInByReservation(billData.reservationNo || '');
        
        if (!checkInData) {
          throw new Error('No check-in found for this reservation. The guest must be checked in first to process payment.');
        }
        
        console.log('Found check-in for reservation:', checkInData);
        
        // Now we have a check-in, we can generate a bill for it if not already generated
        const folioNo = checkInData.folioNo;
        console.log('Using folio number:', folioNo);
        
        // Extract financial year from current date (e.g., 24-25 for 2024-2025)
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const nextYear = currentYear + 1;
        const financialYear = `${currentYear.toString().slice(-2)}-${nextYear.toString().slice(-2)}`;
        console.log('Financial year:', financialYear);
        
        // Generate a bill for this check-in if not already generated
        let billNo = billData.billNo;
        if (!billNo || billNo.startsWith('B-TEMP-')) {
          console.log('Generating bill for folio:', folioNo);
          const billResponse = await billApi.generateBill(folioNo, financialYear);
          console.log('Bill generation response:', billResponse.data);
          
          if (!billResponse.data.success) {
            const errorMsg = billResponse.data.message || 'Failed to generate bill. Please try again.';
            console.error('Bill generation failed:', errorMsg);
            throw new Error(errorMsg);
          }
          
          billNo = billResponse.data.data.billNo;
          console.log('Generated bill number:', billNo);
        }
        
        // Now add the payment to the bill
        console.log('Processing payment for bill:', billNo);
        const paymentData = {
          paymentAmount: paymentForm.paymentAmount,
          modeOfPaymentId: paymentForm.modeOfPaymentId,
          paymentNotes: paymentForm.paymentNotes
        };
        console.log('Payment data:', paymentData);
        
        const paymentResponse = await billApi.addPaymentToBill(billNo, paymentData);
        console.log('Payment response:', paymentResponse.data);
        
        if (!paymentResponse.data.success) {
          const errorMsg = paymentResponse.data.message || 'Failed to process payment. Please try again.';
          console.error('Payment failed:', errorMsg);
          throw new Error(errorMsg);
        }
        
        // Update the UI to reflect the payment
        const newPaidAmount = (billData.paidAmount || 0) + paymentForm.paymentAmount;
        const newBalanceAmount = Math.max(0, billData.balanceAmount - paymentForm.paymentAmount);
        
        // Instead of setting to "Settled", we'll keep it as "Partially Paid" or "Pending"
        // This prevents automatic settlement during bill printing
        let newSettlementStatus = billData.settlementStatus || 'Pending';
        if (newBalanceAmount === 0 && newSettlementStatus !== 'Settled') {
          newSettlementStatus = 'Fully Paid'; // Changed from 'Settled' to 'Fully Paid'
        } else if (newBalanceAmount > 0 && newPaidAmount > 0) {
          newSettlementStatus = 'Partially Paid';
        }
        
        setBillData((prev: any) => ({
          ...prev,
          billNo: billNo,
          folioNo: folioNo,
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          settlementStatus: newSettlementStatus
        }));

        alert('Payment processed successfully!');
        setShowPaymentForm(false);
        
        // Reset payment form
        setPaymentForm({
          paymentAmount: newBalanceAmount,
          modeOfPaymentId: 'CASH',
          paymentNotes: ''
        });
      } else {
        // For folio-based bills
        // Submit payment to API
        const response = await billApi.addPaymentToBill(billData.billNo, {
          paymentAmount: paymentForm.paymentAmount,
          modeOfPaymentId: paymentForm.modeOfPaymentId,
          paymentNotes: paymentForm.paymentNotes
        });
        
        if (response.data.success) {
          // After successful payment, checkout the guest and update room status
          await handleCheckoutAndRoomStatusUpdate();
          
          alert('Payment submitted successfully! Guest has been checked out and room status updated.');
          // Refresh the bill data to show updated payment information
          await generateBillByFolio(billData.folioNo);
          setShowPaymentForm(false);
        } else {
          throw new Error(response.data.message || 'Failed to submit payment');
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to submit payment. Please try again.';
      setPaymentError(errorMessage);
      console.error('Payment submission error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        stack: err.stack
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Function to handle checkout and room status update
  const handleCheckoutAndRoomStatusUpdate = async () => {
    if (!billData) return;
    
    try {
      // Find the check-in record for this folio
      const checkInResponse = await checkInApi.getCheckInByFolio(billData.folioNo);
      
      if (checkInResponse.data.success && checkInResponse.data.data) {
        const checkInData = checkInResponse.data.data;
        
        // Update room status to "VD" (Vacant Dirty) 
        if (checkInData.roomId) {
          await roomApi.updateRoomStatus(checkInData.roomId, 'VD');
          console.log('Room status updated to VD (Vacant Dirty)');
        }
        
        // Update the check-in record with checkout status and bill number
        const checkoutDate = new Date().toISOString();
        await checkInApi.updateCheckIn(billData.folioNo, {
          departureDate: checkoutDate,
          checkout: true, // Mark as checked out
          billNo: billData.billNo // Add bill number to identify checked out records
        });
        console.log('Check-in record updated with checkout status and bill number');
      }
    } catch (error) {
      console.error('Error during checkout process:', error);
      // We don't throw the error to avoid interrupting the payment process
      // but we log it for debugging purposes
    }
  };

  const listAllCheckIns = async () => {
    try {
      const inHouseRes = await checkInApi.getInHouseGuests();
      if (inHouseRes.data.success) {
        const checkIns = inHouseRes.data.data;
        // Set the check-ins data and show the modal
        setCheckInsData(checkIns);
        setShowCheckInsModal(true);
      } else {
        alert('Failed to fetch check-ins');
      }
    } catch (error) {
      console.error('Error listing check-ins:', error);
      alert('Error occurred while listing check-ins. Check console for details.');
    }
  };

  return (
    <Layout>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          
          .bill-print-container, .bill-print-container * {
            visibility: visible;
          }
          
          .bill-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            padding: 20px;
            font-family: Arial, sans-serif;
            box-shadow: none;
          }
          
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Check-ins Modal */}
      {showCheckInsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xs max-h-80 flex flex-col">
            <div className="px-2.5 py-2 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xs font-semibold text-gray-900">In-House Guests</h3>
              <button
                onClick={() => setShowCheckInsModal(false)}
                className="text-gray-400 hover:text-gray-500 text-lg font-bold"
              >
                &times;
              </button>
            </div>
            <div className="overflow-y-auto flex-1 hide-scrollbar">
              <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                  display: none;
                }
                .hide-scrollbar {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>
              {checkInsData.map((checkIn: CheckIn, index: number) => {
                // Find room number
                let roomNo = '';
                if (checkIn.roomId) {
                  const room = rooms.find(r => r.roomId === checkIn.roomId);
                  if (room) {
                    roomNo = room.roomNo;
                  }
                }
                
                return (
                  <div key={checkIn.folioNo} className="px-2.5 py-1.5 border-b border-gray-100 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <span className="text-xs font-medium text-gray-500 mr-1">#{index + 1}</span>
                          <p className="text-xs font-medium text-gray-900 truncate">{checkIn.guestName}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className="font-medium">Folio:</span> {checkIn.folioNo}
                        </p>
                        <div className="flex text-xs text-gray-500 mt-0.5">
                          <span className="font-medium">Room:</span>
                          <span className="ml-1">{roomNo || checkIn.roomNo || 'N/A'}</span>
                          <span className="mx-1">•</span>
                          <span className="font-medium">Date:</span>
                          <span className="ml-1">
                            {checkIn.arrivalDate ? new Date(checkIn.arrivalDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-2.5 py-2 bg-gray-50 text-right">
              <button
                onClick={() => setShowCheckInsModal(false)}
                className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Generate Bill</h1>
        </div>

        {!billData ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Bill Generation</h2>
            
            {/* Tabs - added 'room' tab */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                className={`py-2 px-4 font-medium text-sm ${activeTab === 'reservation' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('reservation')}
              >
                By Reservation
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm ${activeTab === 'folio' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('folio')}
              >
                By Folio
              </button>
              {/* Added 'By Room' tab */}
              <button
                className={`py-2 px-4 font-medium text-sm ${activeTab === 'room' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('room')}
              >
                By Room
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'reservation' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reservation Number *
                  </label>
                  <input
                    type="text"
                    name="reservationNo"
                    value={formData.reservationNo}
                    onChange={handleInputChange}
                    placeholder="Enter reservation number to generate bill"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Enter the reservation number for which you want to generate a bill</p>
                </div>
              ) : activeTab === 'room' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Number *
                  </label>
                  <input
                    type="text"
                    name="roomNo"
                    value={formData.roomNo}
                    onChange={handleInputChange}
                    placeholder="Enter room number to generate bill"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Enter the room number for which you want to generate a bill</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Folio Number *
                  </label>
                  <input
                    type="text"
                    name="folioNo"
                    value={formData.folioNo}
                    onChange={handleInputChange}
                    placeholder="Enter folio number to generate bill"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Enter the folio number for which you want to generate a bill</p>
                </div>
              )}
              
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating...' : 'Generate Bill'}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span>Clear</span>
                </button>
                {(activeTab === 'folio' || activeTab === 'room') && (
                  <button
                    type="button"
                    onClick={listAllCheckIns}
                    className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>List Check-ins</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bill Content Container - For PDF/Print */}
            <div ref={billContentRef} className="bill-print-container bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* Bill Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <img 
                      src="https://www.kayak.com/rimg/dimg/dynamic/19/2023/10/1f291c08d1fa915b2d6a1a3e87cd04a6.webp" 
                      alt="Hotel Star Logo" 
                      className="h-16 w-auto mb-2"
                    />
                    <p className="text-gray-600">123 Hotel Street, City, State 12345</p>
                    <p className="text-gray-600">Phone: (123) 456-7890</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-xl font-bold text-gray-900">BILL</h4>
                    <p className="text-gray-600">Date: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              {/* Bill Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Bill Information</h4>
                <div className="border-t border-b border-gray-200 py-4 my-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600">Bill No:</p>
                      <p className="font-semibold">{billData.billNo || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">{activeTab === 'reservation' ? 'Reservation No:' : 'Folio No:'}</p>
                      <p className="font-semibold">{activeTab === 'reservation' ? billData.reservationNo : billData.folioNo}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Guest Name:</p>
                      <p className="font-semibold">{billData.guestName}</p>
                    </div>
                    {activeTab === 'folio' && (
                      <div>
                        <p className="text-gray-600">Room No:</p>
                        <p className="font-semibold">{billData.roomNo || 'N/A'}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-600">Generated At:</p>
                      <p className="font-semibold">{billData.generatedAt || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Settlement Status:</p>
                      <p className="font-semibold">{billData.settlementStatus || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Transaction Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Additional Charges Details</h4>
                {billTransactions.length > 0 || expenses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Head</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₹)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {/* Render regular transactions */}
                        {billTransactions.map((transaction: any, index: number) => (
                          <tr key={`transaction-${index}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.date || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.accHeadName || transaction.accHeadId || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{transaction.amount?.toFixed(2) || '0.00'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{transaction.narration || '-'}</td>
                          </tr>
                        ))}
                        
                        {/* Render expenses */}
                        {expenses.map((expense: Expense, index: number) => (
                          <tr key={`expense-${index}`} className="bg-blue-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Expense</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{expense.amount?.toFixed(2) || '0.00'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{expense.narration || '-'}</td>
                          </tr>
                        ))}
                        
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={2}>Total Additional Charges</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{(billTransactions
                              .filter((transaction: any) => transaction.accHeadId !== 'ROOM_CHARGES')
                              .reduce((sum: number, transaction: any) => sum + (transaction.amount || 0), 0) + 
                              expenses.reduce((sum: number, expense: Expense) => sum + (expense.amount || 0), 0)
                            ).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No transactions found for this {activeTab === 'reservation' ? 'reservation' : 'folio'}.</p>
                )}
              </div>
              
              {/* Advance Payment Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Advance Payments</h4>
                {billAdvances.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₹)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {billAdvances.map((advance: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{advance.receiptNo || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{advance.date ? new Date(advance.date).toLocaleDateString() : 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{advance.modeOfPaymentName || advance.modeOfPaymentId || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{advance.amount?.toFixed(2) || '0.00'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{advance.narration || '-'}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={3}>Total Advance Amount</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{billAdvances.reduce((sum, advance) => sum + (advance.amount || 0), 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No advance payments found for this {activeTab === 'reservation' ? 'reservation' : 'folio'}.</p>
                )}
              </div>
              
              {/* Payment Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Payment Summary</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Room Charges</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{billData.roomCharges?.toFixed(2) || '0.00'}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Additional Charges</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{billData.additionalCharges?.toFixed(2) || '0.00'}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Expense Charges</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{billData.expenseCharges?.toFixed(2) || '0.00'}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Subtotal</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{billData.subtotal?.toFixed(2) || '0.00'}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Advance Paid</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{billAdvances.reduce((sum, advance) => sum + (advance.amount || 0), 0).toFixed(2)}</td>
                      </tr>
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Balance Amount</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{billData.balanceAmount?.toFixed(2) || '0.00'}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Paid Amount</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{billData.paidAmount?.toFixed(2) || '0.00'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Additional Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  {activeTab === 'reservation' ? (
                    <>
                      <div>
                        <p className="text-gray-600">Check-in Date:</p>
                        <p className="font-semibold">{billData.checkInDate || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Check-out Date:</p>
                        <p className="font-semibold">{billData.checkOutDate || 'N/A'}</p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="text-gray-600">Settlement Date:</p>
                      <p className="font-semibold">{billData.settlementDate || 'N/A'}</p>
                    </div>
                  )}
                  
                  {billData.paymentNotes && (
                    <div className="col-span-2">
                      <p className="text-gray-600">Payment Notes:</p>
                      <p className="font-semibold">{billData.paymentNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Payment Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 no-print">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Make Payment</h4>
                <button
                  onClick={() => setShowPaymentForm(!showPaymentForm)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {showPaymentForm ? 'Cancel Payment' : 'Add Payment'}
                </button>
              </div>
              
              {showPaymentForm && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h5 className="text-md font-medium text-gray-800 mb-3">Payment Details</h5>
                  
                  {paymentError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                      {paymentError}
                    </div>
                  )}
                  
                  <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Amount *
                        </label>
                        <input
                          type="number"
                          id="paymentAmount"
                          name="paymentAmount"
                          value={paymentForm.paymentAmount}
                          onChange={handlePaymentFormChange}
                          step="0.01"
                          min="0"
                          max={billData.balanceAmount}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Balance amount: ₹{billData.balanceAmount?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      
                      <div>
                        <label htmlFor="modeOfPaymentId" className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Method *
                        </label>
                        <select
                          id="modeOfPaymentId"
                          name="modeOfPaymentId"
                          value={paymentForm.modeOfPaymentId}
                          onChange={handlePaymentFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          {paymentModes.map(mode => (
                            <option key={mode.id} value={mode.id}>
                              {mode.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="paymentNotes" className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Notes
                      </label>
                      <textarea
                        id="paymentNotes"
                        name="paymentNotes"
                        value={paymentForm.paymentNotes}
                        onChange={handlePaymentFormChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter any additional notes about the payment..."
                      />
                    </div>
                    
                    <div className="flex space-x-3 pt-4">
                      <button
                        type="submit"
                        disabled={paymentLoading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
                      >
                        {paymentLoading ? 'Processing...' : 'Submit Payment'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6 no-print">
              <button
                onClick={downloadBillAsPDF}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Download PDF
              </button>
              <button
                onClick={updateBill}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Bill'}
              </button>
              <button
                onClick={() => {
                  fetchRelatedBills(billData.billNo);
                }}
                disabled={loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Related Bills
              </button>
              <button
                onClick={handleClear}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Generate Another
              </button>
            </div>

            {/* Related Bills Section */}
            {showRelatedBills && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6 no-print">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Related Bills</h4>
                {relatedBills.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Charges</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Additional Charges</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advance Paid</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {relatedBills.map((bill: any, index: number) => (
                          <RelatedBillRow key={index} bill={bill} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No related bills found.</p>
                )}
                <button
                  onClick={() => setShowRelatedBills(false)}
                  className="mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close Related Bills
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};


const RelatedBillRow: React.FC<{ bill: any }> = ({ bill }) => {
  // Calculate room charges
  const roomCharges = bill.roomCharges || 0;
  
  // If not available, fallback to totalAmount
  const fallbackRoomCharges = bill.totalAmount || 0;
  
  // Use fallback only if roomCharges is not explicitly set
  const finalRoomCharges = roomCharges || fallbackRoomCharges;
  
  // Calculate additional charges from transactions (excluding room charge
  const billTransactions: any[] = bill.transactions || [];
  const totalTransactions = billTransactions
    .filter((transaction: any) => transaction.accHeadId !== 'ROOM_CHARGES')
    .reduce((sum: number, transaction: any) => sum + (transaction.amount || 0), 0);
  
  // Calculate expense charges (assuming expenses data is available in the bill object)
  const expenseCharges = bill.expenseCharges || 0;
  
  // Calculate subtotal
  const subtotal = finalRoomCharges + totalTransactions + expenseCharges;
  
  // Use advance amount directly from bill data
  const advanceAmount = bill.advanceAmount || 0;
  
  // Use balance amount directly from bill data
  const balanceAmount = bill.balanceAmount !== undefined 
    ? bill.balanceAmount 
    : subtotal - advanceAmount;
  
  // Fetch advances from all three contexts when component mounts
  React.useEffect(() => {
    const fetchAllAdvances = async () => {
      let allAdvances: any[] = [];
      
      // 1. Fetch advances by folio number if available
      if (bill.folioNo) {
        try {
          const advancesResponse = await advanceApi.getAdvancesByFolio(bill.folioNo);
          if (advancesResponse.data.success) {
            allAdvances = [...allAdvances, ...advancesResponse.data.data];
          }
        } catch (advanceError) {
          console.error('Failed to fetch advances by folio:', advanceError);
        }
      }
      
      // 2. Fetch advances by bill number if available
      if (bill.billNo) {
        try {
          const advancesResponse = await advanceApi.getAdvancesByBill(bill.billNo);
          if (advancesResponse.data.success) {
            allAdvances = [...allAdvances, ...advancesResponse.data.data];
          }
        } catch (advanceError) {
          console.error('Failed to fetch advances by bill:', advanceError);
        }
      }
      
      // 3. Fetch advances by reservation number if available
      if (bill.reservationNo) {
        try {
          const advancesResponse = await advanceApi.getAdvancesByReservation(bill.reservationNo);
          if (advancesResponse.data.success) {
            allAdvances = [...allAdvances, ...advancesResponse.data.data];
          }
        } catch (advanceError) {
          console.error('Failed to fetch advances by reservation:', advanceError);
        }
      }
      
      // Remove duplicate advances based on advanceId
      const uniqueAdvances = allAdvances.filter((advance, index, self) => 
        index === self.findIndex(a => a.advanceId === advance.advanceId)
      );
      
      // Calculate total advance amount
      const totalAdvanceAmount = uniqueAdvances.reduce((sum: number, advance: any) => sum + (advance.amount || 0), 0);
      
      // Update the advance amount and balance if they differ from current values
      if (totalAdvanceAmount !== advanceAmount) {
        // In a real implementation, we would update the parent component state here
        // For now, we'll just log the difference
        console.log(`Advance amount difference detected for bill ${bill.billNo}. Current: ${advanceAmount}, Calculated: ${totalAdvanceAmount}`);
      }
    };
    
    fetchAllAdvances();
  }, [bill.folioNo, bill.billNo, bill.reservationNo, advanceAmount, subtotal]);
  
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.billNo || 'N/A'}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.guestName || 'N/A'}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{finalRoomCharges.toFixed(2)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{totalTransactions.toFixed(2)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{subtotal.toFixed(2)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{advanceAmount.toFixed(2)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{balanceAmount.toFixed(2)}</td>
    </tr>
  );
};

export default BillGeneration;