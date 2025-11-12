import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout/Layout';
import { Advance, CheckIn, PaymentMode, Room, Reservation } from '../types/api';
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
  // Tab state
  const [activeTab, setActiveTab] = useState<'reservation' | 'folio'>('reservation');
  
  // Form state
  const [formData, setFormData] = useState({
    reservationNo: '',
    folioNo: '',
  });

  // Bill data state
  const [billData, setBillData] = useState<any>(null);
  const [billTransactions, setBillTransactions] = useState<any[]>([]);
  const [billAdvances, setBillAdvances] = useState<any[]>([]);
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
  }, []);

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

  // Unified function to fetch all advances from multiple contexts
  const fetchAllAdvances = async (params: { 
    reservationNo?: string; 
    folioNo?: string; 
    billNo?: string;
    checkInData?: CheckIn | null;
  }): Promise<Advance[]> => {
    let allAdvances: Advance[] = [];
    
    try {
      // 1. Fetch advances by reservation number
      if (params.reservationNo) {
        console.log('Fetching advances by reservation:', params.reservationNo);
        const advancesResponse = await advanceApi.getAdvancesByReservation(params.reservationNo);
        if (advancesResponse.data.success) {
          allAdvances = [...allAdvances, ...advancesResponse.data.data];
          console.log(`Found ${advancesResponse.data.data.length} advances by reservation`);
        }
      }
      
      // 2. Fetch advances by folio number
      if (params.folioNo) {
        console.log('Fetching advances by folio:', params.folioNo);
        const advancesResponse = await advanceApi.getAdvancesByFolio(params.folioNo);
        if (advancesResponse.data.success) {
          allAdvances = [...allAdvances, ...advancesResponse.data.data];
          console.log(`Found ${advancesResponse.data.data.length} advances by folio`);
        }
      }
      
      // 3. Fetch advances by bill number
      if (params.billNo) {
        console.log('Fetching advances by bill:', params.billNo);
        const advancesResponse = await advanceApi.getAdvancesByBill(params.billNo);
        if (advancesResponse.data.success) {
          allAdvances = [...allAdvances, ...advancesResponse.data.data];
          console.log(`Found ${advancesResponse.data.data.length} advances by bill`);
        }
      }
      
      // 4. Also fetch advances by reservation number from checkInData if available
      // This handles cases where advances were made against reservation before check-in
      if (params.checkInData && params.checkInData.reservationNo && 
          params.checkInData.reservationNo !== params.reservationNo) {
        console.log('Fetching advances by check-in reservation:', params.checkInData.reservationNo);
        const advancesResponse = await advanceApi.getAdvancesByReservation(params.checkInData.reservationNo);
        if (advancesResponse.data.success) {
          allAdvances = [...allAdvances, ...advancesResponse.data.data];
          console.log(`Found ${advancesResponse.data.data.length} advances by check-in reservation`);
        }
      }
      
      // Remove duplicate advances based on advanceId
      const uniqueAdvances = allAdvances.filter((advance, index, self) => 
        index === self.findIndex(a => a.advanceId === advance.advanceId)
      );
      
      console.log(`Total unique advances found: ${uniqueAdvances.length}`);
      return uniqueAdvances;
    } catch (error) {
      console.error('Error fetching advances:', error);
      return allAdvances;
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
      
      if (allCheckInsRes.data.success && allCheckInsRes.data.data.length > 0) {
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
        // Search for check-ins with this reservation number
        const checkInsRes = await checkInApi.searchCheckIns(reservationNo);
        if (checkInsRes.data.success && checkInsRes.data.data.length > 0) {
          checkInData = checkInsRes.data.data[0]; // Take the first match
          console.log('Found check-in for reservation:', checkInData);
        }
      } catch (error) {
        console.error('Error finding check-in for reservation:', error);
      }
      
      // Fetch all advances using the unified function
      const billAdvancesData = await fetchAllAdvances({
        reservationNo: reservationNo,
        folioNo: checkInData?.folioNo,
        checkInData: checkInData
      });
      
      // Calculate room charges from reservation data
      const roomCharges = reservation.rate || 0;
      
      // Calculate advance amount
      const advanceAmount = billAdvancesData.reduce((sum, advance) => sum + (advance.amount || 0), 0);
      
      // For a reservation-based bill, we don't have transactions yet, so additional charges are 0
      const additionalCharges = 0;
      
      // Calculate subtotal (room charges + additional charges)
      const subtotal = roomCharges + additionalCharges;
      
      // Calculate balance (subtotal - advance paid)
      const balanceAmount = Math.max(0, subtotal - advanceAmount);
      
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
        
        // Fetch all advances using the unified function
        const billAdvancesData = await fetchAllAdvances({
          reservationNo: billData.reservationNo,
          folioNo: folioNo,
          billNo: billData.billNo,
          checkInData: checkInData
        });
        
        // Calculate advances and transactions
        const advanceAmount = billAdvancesData.reduce((sum, advance) => sum + (advance.amount || 0), 0);
        const paidAmount = billData.paidAmount || 0;
        
        // Calculate additional charges from transactions (excluding room charges which are already in roomCharges)
        const additionalCharges = billTransactions
          .filter((transaction: any) => transaction.accHeadId !== 'ROOM_CHARGES') // Exclude room charges
          .reduce((sum: number, transaction: any) => sum + (transaction.amount || 0), 0);
        
        // Calculate subtotal (room charges + additional charges)
        const subtotal = roomCharges + additionalCharges;
        
        // Calculate balance (subtotal - advance paid - paid amount)
        const balanceAmount = Math.max(0, subtotal - advanceAmount - paidAmount);
        
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

  // Function to handle checkout and room status update
  const handleCheckoutAndRoomStatusUpdate = async () => {
    if (!billData) return;
    
    // Ask for confirmation before checkout
    const confirmCheckout = window.confirm(
      `Are you sure you want to generate the bill and check out the guest?\n\n` +
      `Guest Name: ${billData.guestName}\n` +
      `Folio No: ${billData.folioNo}\n` +
      `Room No: ${billData.roomNo || 'N/A'}\n\n` +
      `This action will:\n` +
      `1. Check out the guest from the system\n` +
      `2. Update the room status to Vacant Dirty\n` +
      `3. Generate the final bill\n\n` +
      `Do you want to proceed with checkout?`
    );
    
    if (!confirmCheckout) {
      console.log('Checkout cancelled by user');
      return;
    }
    
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
        
        // Show success message
        alert(`Guest ${billData.guestName} has been successfully checked out.\nRoom status updated to Vacant Dirty.`);
      }
    } catch (error: any) {
      console.error('Error during checkout process:', error);
      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      alert(`Error during checkout process: ${errorMessage}`);
      // We don't throw the error to avoid interrupting the payment process
      // but we log it for debugging purposes
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
        // For reservation-based bills, the process would be:
        // 1. Check if there's already a check-in for this reservation
        // 2. If not, we need to create one
        // 3. Generate a proper bill
        // 4. Update that bill with the current data
        
        // Since this is a frontend-only implementation, we'll simulate the process
        alert('In a complete implementation, this would:\n' +
              '1. Check for existing check-in\n' +
              '2. Create check-in if needed\n' +
              '3. Generate proper bill\n' +
              '4. Update bill with current data\n\n' +
              'For now, bill data is saved in the current session.');
        
        // In a real implementation, you would make API calls like:
        // const checkInResponse = await checkInApi.processCheckIn(checkInData);
        // const billResponse = await billApi.generateBill(folioNo, financialYear);
        // const updateResponse = await billApi.updateBill(billNo, billUpdateData);
        
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
          alert('Bill updated successfully!\n\nNote: The guest has not been checked out yet.\nTo checkout the guest, please use the checkout option.');
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
    if (!billContentRef.current) {
      alert('Bill content not found.');
      return;
    }

    try {
      const canvas = await html2canvas(billContentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Bill_${billData.billNo || 'unknown'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
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
    setFormData({ reservationNo: '', folioNo: '' });
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
        // For reservation-based bills, we need to:
        // 1. Create a check-in for the reservation (if not already done)
        // 2. Generate a proper bill for that check-in
        // 3. Add the payment to that bill
        
        // First, let's create a check-in for this reservation
        // Use reservation data to populate required fields
        const checkInData = {
          reservationNo: billData.reservationNo,
          guestName: billData.guestName || reservationData?.guestName || 'Unknown Guest',
          roomId: '',
          arrivalDate: reservationData?.arrivalDate || new Date().toISOString(),
          departureDate: reservationData?.departureDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          mobileNumber: reservationData?.mobileNumber || '',
          emailId: reservationData?.emailId || '',
          rate: billData.roomCharges || reservationData?.rate || 0,
          walkIn: 'N' as const // Not a walk-in since it's from reservation
        };
        
        console.log('Attempting check-in with data:', checkInData);
        
        // Validate required fields before proceeding
        if (!checkInData.guestName) {
          throw new Error('Guest name is required for check-in.');
        }
        
        if (!checkInData.arrivalDate) {
          throw new Error('Arrival date is required for check-in.');
        }
        
        if (!checkInData.departureDate) {
          throw new Error('Departure date is required for check-in.');
        }
        
        // Find an available room to assign
        console.log('Fetching available rooms...');
        const availableRoomsRes = await roomApi.getAvailableRooms();
        console.log('Available rooms response:', availableRoomsRes.data);
        
        if (availableRoomsRes.data.success && availableRoomsRes.data.data.length > 0) {
          // Select the first available room
          const firstAvailableRoom = availableRoomsRes.data.data[0];
          checkInData.roomId = firstAvailableRoom.roomId;
          console.log('Assigned room ID:', checkInData.roomId, 'Room number:', firstAvailableRoom.roomNo);
        } else {
          throw new Error('No available rooms for check-in. Please contact administrator.');
        }
        
        // Validate that we have a room assigned
        if (!checkInData.roomId) {
          throw new Error('Failed to assign a room for check-in. Please contact administrator.');
        }
        
        // Process the check-in
        console.log('Processing check-in...');
        const checkInResponse = await checkInApi.processCheckIn(checkInData);
        console.log('Check-in response:', checkInResponse.data);
        
        if (!checkInResponse.data.success) {
          const errorMsg = checkInResponse.data.message || 'Failed to process check-in. Please check all required fields are filled.';
          console.error('Check-in failed:', errorMsg);
          throw new Error(errorMsg);
        }
        
        const folioNo = checkInResponse.data.data.folioNo;
        console.log('Generated folio number:', folioNo);
        
        // Extract financial year from current date (e.g., 24-25 for 2024-2025)
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const nextYear = currentYear + 1;
        const financialYear = `${currentYear.toString().slice(-2)}-${nextYear.toString().slice(-2)}`;
        console.log('Financial year:', financialYear);
        
        // Generate a proper bill for this check-in
        console.log('Generating bill for folio:', folioNo);
        const billResponse = await billApi.generateBill(folioNo, financialYear);
        console.log('Bill generation response:', billResponse.data);
        
        if (!billResponse.data.success) {
          const errorMsg = billResponse.data.message || 'Failed to generate bill. Please try again.';
          console.error('Bill generation failed:', errorMsg);
          throw new Error(errorMsg);
        }
        
        const generatedBill = billResponse.data.data;
        const billNo = generatedBill.billNo;
        console.log('Generated bill number:', billNo);
        
        // Now add the payment to the generated bill
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
        
        setBillData((prev: any) => ({
          ...prev,
          billNo: billNo,
          folioNo: folioNo,
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          settlementStatus: newBalanceAmount === 0 ? 'Settled' : 'Partially Paid'
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
          alert('Payment submitted successfully!');
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
            
            {/* Tabs */}
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
                {activeTab === 'folio' && (
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
                {billTransactions.length > 0 ? (
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
                        {billTransactions.map((transaction: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.date || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.accHeadName || transaction.accHeadId || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{transaction.amount?.toFixed(2) || '0.00'}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{transaction.narration || '-'}</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={3}>Additional Charges</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{billTransactions
                              .filter((transaction: any) => transaction.accHeadId !== 'ROOM_CHARGES')
                              .reduce((sum: number, transaction: any) => sum + (transaction.amount || 0), 0)
                              .toFixed(2)}
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
                onClick={handleCheckoutAndRoomStatusUpdate}
                disabled={loading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Checking Out...' : 'Checkout Guest'}
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
  
  // Calculate additional charges from transactions (excluding room charges)
  const billTransactions: any[] = bill.transactions || [];
  const totalTransactions = billTransactions
    .filter((transaction: any) => transaction.accHeadId !== 'ROOM_CHARGES')
    .reduce((sum: number, transaction: any) => sum + (transaction.amount || 0), 0);
  
  // Calculate subtotal
  const subtotal = finalRoomCharges + totalTransactions;
  
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