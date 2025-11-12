import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowsRightLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckIn as CheckInType, Room, Advance, RoomType, Company, PlanType, SettlementType, ArrivalMode, Nationality, RefMode, ReservationSource, Reservation } from '../types/api';
import { checkInApi, roomApi, advanceApi, reservationApi, masterDataApi } from '../services/api';
import Layout from '../components/Layout/Layout';
import Modal from '../components/Modal';
import { handleApiError, isUnauthorizedError } from '../utils/errorHandler';
import { useAuth } from '../contexts/AuthContext';

const CheckIn: React.FC = () => {
  const { handleUnauthorizedError } = useAuth();
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [reservationInfo, setReservationInfo] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'additional'>('basic');
  const [editFormTab, setEditFormTab] = useState<'basic' | 'additional'>('basic');
  
  // Master data states
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [planTypes, setPlanTypes] = useState<PlanType[]>([]);
  const [settlementTypes, setSettlementTypes] = useState<SettlementType[]>([]);
  const [arrivalModes, setArrivalModes] = useState<ArrivalMode[]>([]);
  const [nationalities, setNationalities] = useState<Nationality[]>([]);
  const [refModes, setRefModes] = useState<RefMode[]>([]);
  const [reservationSources, setReservationSources] = useState<ReservationSource[]>([]);
  const [masterDataLoading, setMasterDataLoading] = useState(false);
  const [masterDataFetched, setMasterDataFetched] = useState(false);

  // In-house guests states
  const [inHouseGuests, setInHouseGuests] = useState<CheckInType[]>([]);
  const [checkedOutGuests, setCheckedOutGuests] = useState<CheckInType[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<CheckInType[]>([]);
  const [editingCheckIn, setEditingCheckIn] = useState<CheckInType | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [manageCheckInsTab, setManageCheckInsTab] = useState<'inhouse' | 'checkedout'>('inhouse');
  
  // Search criteria states
  const [folioNoSearch, setFolioNoSearch] = useState('');
  const [roomNoSearch, setRoomNoSearch] = useState('');
  const [guestNameSearch, setGuestNameSearch] = useState('');
  const [arrivalDateSearch, setArrivalDateSearch] = useState('');
  const [departureDateSearch, setDepartureDateSearch] = useState('');

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

  // Reservation selection modal state
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationSearchTerm, setReservationSearchTerm] = useState('');

  // Debounce ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Filter reservations based on search term
  useEffect(() => {
    if (!reservationSearchTerm) {
      setFilteredReservations(reservations);
      return;
    }
    
    // Debounce search to avoid excessive filtering
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      const term = reservationSearchTerm.toLowerCase();
      const filtered = reservations.filter(reservation => 
        reservation.reservationNo.toLowerCase().includes(term) ||
        reservation.guestName.toLowerCase().includes(term) ||
        new Date(reservation.arrivalDate).toLocaleDateString('en-GB').includes(term) ||
        new Date(reservation.departureDate).toLocaleDateString('en-GB').includes(term) ||
        (reservation.mobileNumber && reservation.mobileNumber.includes(term))
      );
      
      setFilteredReservations(filtered);
    }, 300);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [reservationSearchTerm, reservations]);

  const [formData, setFormData] = useState({
    reservationNo: '',
    guestName: '',
    arrivalDate: '',
    departureDate: '',
    noOfDays: 1,
    noOfPersons: 1,
    mobileNumber: '',
    rate: 0,
    roomId: '',
    remarks: '',
    includingGst: 'Y' as 'Y' | 'N',
    // Additional details fields
    emailId: '',
    idProof1: '',
    idProof2: '',
    idProof3: '',
    companyId: '',
    planId: '',
    roomTypeId: '',
    settlementTypeId: '',
    arrivalModeId: '',
    arrivalDetails: '',
    nationalityId: '',
    refModeId: '',
    resvSourceId: '',
  });

  // Edit form data state
  const [editFormData, setEditFormData] = useState({
    folioNo: '',
    reservationNo: '',
    guestName: '',
    roomId: '',
    arrivalDate: '',
    departureDate: '',
    noOfDays: 1,
    mobileNumber: '',
    emailId: '',
    rate: 0,
    walkIn: 'N' as 'Y' | 'N',
    remarks: '',
    idProof1: '',
    idProof2: '',
    idProof3: '',
    companyId: '',
    planId: '',
    roomTypeId: '',
    settlementTypeId: '',
    arrivalModeId: '',
    arrivalDetails: '',
    nationalityId: '',
    refModeId: '',
    resvSourceId: '',
    includingGst: 'N' as 'Y' | 'N',
    noOfPersons: 1,
    checkout: false,
  });

  // Show notification function
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

  // Fetch all reservations
  const fetchAllReservations = async () => {
    setReservationsLoading(true);
    try {
      const response = await reservationApi.getReservations();
      if (response.data.success) {
        // Filter out reservations that have already been fully checked in
        const availableReservations = response.data.data.filter((reservation: Reservation) => {
          const roomsCheckedIn = reservation.roomsCheckedIn || 0;
          const noOfRooms = reservation.noOfRooms || 0;
          return roomsCheckedIn < noOfRooms;
        });
        // Sort reservations by arrival date (closest first)
        const sortedReservations = availableReservations.sort((a: Reservation, b: Reservation) => {
          return new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime();
        });
        setReservations(sortedReservations);
        setFilteredReservations(sortedReservations);
        setReservationSearchTerm('');
      }
    } catch (error) {
      showNotification('Failed to fetch reservations. Please try again.', false);
    } finally {
      setReservationsLoading(false);
    }
  };

  // Handle reservation selection
  const handleSelectReservation = (reservation: Reservation) => {
    // Check if reservation still has rooms available
    const roomsCheckedIn = reservation.roomsCheckedIn || 0;
    const noOfRooms = reservation.noOfRooms || 0;
    const remainingRooms = noOfRooms - roomsCheckedIn;
    
    if (remainingRooms <= 0) {
      showNotification('All rooms for this reservation have already been checked in.', false);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      reservationNo: reservation.reservationNo,
      guestName: reservation.guestName,
      arrivalDate: reservation.arrivalDate || '',
      departureDate: reservation.departureDate || '',
      noOfDays: 1,
      noOfPersons: reservation.noOfPersons || 1,
      mobileNumber: reservation.mobileNumber || '',
      rate: reservation.rate || 0,
      includingGst: (reservation.includingGst || 'N') as 'Y' | 'N',
      remarks: reservation.remarks || '',
      // Additional details from reservation
      emailId: reservation.emailId || '',
      idProof1: reservation.idProof1 || '',
      idProof2: reservation.idProof2 || '',
      idProof3: reservation.idProof3 || '',
      companyId: reservation.companyId || '',
      planId: reservation.planId || '',
      roomTypeId: reservation.roomTypeId || '',
      settlementTypeId: reservation.settlementTypeId || '',
      arrivalModeId: reservation.arrivalModeId || '',
      arrivalDetails: reservation.arrivalDetails || '',
      nationalityId: reservation.nationalityId || '',
      refModeId: reservation.refModeId || '',
      resvSourceId: (reservation as any).resvSourceId || reservation.reservationSourceId || ''
    }));
    
    setReservationInfo(reservation);
    setReservationModalOpen(false);
    setIsWalkIn(false); // Ensure we're not in walk-in mode
  };

  // Fetch in-house guests (not checked out)
  const fetchInHouseGuests = async () => {
    try {
      const response = await checkInApi.getInHouseGuests();
      if (response.data.success) {
        // Filter out checked out guests
        const inHouseOnly = response.data.data.filter(guest => !guest.checkout);
        setInHouseGuests(inHouseOnly);
        // If we're currently viewing in-house guests, update filtered guests
        if (manageCheckInsTab === 'inhouse') {
          setFilteredGuests(inHouseOnly);
        }
      }
    } catch (error) {
      showNotification('Failed to fetch in-house guests. Please try again.', false);
    }
  };

  // Fetch checked-out guests
  const fetchCheckedOutGuests = async () => {
    try {
      const response = await checkInApi.getInHouseGuests();
      if (response.data.success) {
        // Filter to only checked out guests
        const checkedOutOnly = response.data.data.filter(guest => guest.checkout);
        setCheckedOutGuests(checkedOutOnly);
        // If we're currently viewing checked-out guests, update filtered guests
        if (manageCheckInsTab === 'checkedout') {
          setFilteredGuests(checkedOutOnly);
        }
      }
    } catch (error) {
      showNotification('Failed to fetch checked-out guests. Please try again.', false);
    }
  };

  // Enhanced search function with multiple criteria
  const searchCheckInsWithCriteria = () => {
    setSearchLoading(true);
    
    // Get the appropriate guest list based on current tab
    const currentGuests = manageCheckInsTab === 'inhouse' ? inHouseGuests : checkedOutGuests;
    
    try {
      // Filter guests by multiple criteria
      const filteredGuestsList = currentGuests.filter(guest => {
        // Check folio number
        if (folioNoSearch && !guest.folioNo.toLowerCase().includes(folioNoSearch.toLowerCase())) {
          return false;
        }
        
        // Check room number
        if (roomNoSearch) {
          const roomNo = getRoomNoByIdWithFallback(guest.roomId, guest.roomNo).toLowerCase();
          if (!roomNo.includes(roomNoSearch.toLowerCase())) {
            return false;
          }
        }
        
        // Check guest name
        if (guestNameSearch && !guest.guestName.toLowerCase().includes(guestNameSearch.toLowerCase())) {
          return false;
        }
        
        // Check arrival date
        if (arrivalDateSearch) {
          const guestArrivalDate = new Date(guest.arrivalDate).toISOString().split('T')[0];
          if (guestArrivalDate !== arrivalDateSearch) {
            return false;
          }
        }
        
        // Check departure date
        if (departureDateSearch) {
          const guestDepartureDate = new Date(guest.departureDate).toISOString().split('T')[0];
          if (guestDepartureDate !== departureDateSearch) {
            return false;
          }
        }
        
        return true;
      });
      
      setFilteredGuests(filteredGuestsList);
    } catch (error) {
      console.error('Search failed:', error);
      showNotification('Search failed. Showing all guests.', false);
      // Show all guests based on current tab
      if (manageCheckInsTab === 'inhouse') {
        setFilteredGuests(inHouseGuests);
      } else {
        setFilteredGuests(checkedOutGuests);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  // Clear search function
  const clearSearch = () => {
    setFolioNoSearch('');
    setRoomNoSearch('');
    setGuestNameSearch('');
    setArrivalDateSearch('');
    setDepartureDateSearch('');
    
    // Reset the filtered guests to the current tab's full list
    if (manageCheckInsTab === 'inhouse') {
      setFilteredGuests(inHouseGuests);
    } else {
      setFilteredGuests(checkedOutGuests);
    }
  };

  // Get room number by room ID
  const getRoomNoById = (roomId: string) => {
    // First check in available rooms
    let room = availableRooms.find(r => r.roomId === roomId);
    
    // If not found, check in all rooms
    if (!room) {
      room = allRooms.find(r => r.roomId === roomId);
    }
    
    return room ? room.roomNo : '';
  };

  // Get room by room ID
  const getRoomById = (roomId: string) => {
    return availableRooms.find(r => r.roomId === roomId);
  };

  // Get room number by room ID with fallback
  const getRoomNoByIdWithFallback = (roomId: string, roomNo?: string) => {
    // Try to get from available rooms first
    const roomNoFromAvailable = getRoomNoById(roomId);
    
    // If not found, use the roomNo from the checkIn object if available
    return roomNoFromAvailable || roomNo || 'N/A';
  };

  // Handle edit check-in
  const handleEditCheckIn = (checkIn: CheckInType) => {
    setEditingCheckIn(checkIn);
    setEditFormData({
      folioNo: checkIn.folioNo || '',
      reservationNo: checkIn.reservationNo || '',
      guestName: checkIn.guestName || '',
      roomId: checkIn.roomId || '',
      arrivalDate: checkIn.arrivalDate || '',
      departureDate: checkIn.departureDate || '',
      noOfDays: 1, // Will be calculated by useEffect
      mobileNumber: checkIn.mobileNumber || '',
      emailId: checkIn.emailId || '',
      rate: checkIn.rate || 0,
      walkIn: checkIn.walkIn || 'N',
      remarks: checkIn.remarks || '',
      idProof1: checkIn.idProof1 || '',
      idProof2: checkIn.idProof2 || '',
      idProof3: checkIn.idProof3 || '',
      companyId: checkIn.companyId || '',
      planId: checkIn.planId || '',
      roomTypeId: checkIn.roomTypeId || '',
      settlementTypeId: checkIn.settlementTypeId || '',
      arrivalModeId: checkIn.arrivalModeId || '',
      arrivalDetails: checkIn.arrivalDetails || '',
      nationalityId: checkIn.nationalityId || '',
      refModeId: checkIn.refModeId || '',
      resvSourceId: checkIn.resvSourceId || '',
      includingGst: (checkIn.includingGst || 'N') as 'Y' | 'N',
      noOfPersons: checkIn.noOfPersons || 1,
      checkout: checkIn.checkout || false,
    });
    
    // Fetch master data if not already fetched
    if (!masterDataFetched) {
      fetchMasterData();
    }
    
    // Fetch available rooms and all rooms if not already fetched
    if (availableRooms.length === 0) {
      fetchAvailableRooms();
    }
    
    if (allRooms.length === 0) {
      fetchAllRooms();
    }
  };

  // Handle edit form input changes
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : 
               name === 'includingGst' ? value as 'Y' | 'N' : value,
    }));
  };

  // Update check-in details
  const handleUpdateCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCheckIn && editingCheckIn.folioNo) {
        const checkInData = {
          reservationNo: editFormData.reservationNo || undefined,
          guestName: editFormData.guestName || undefined,
          roomId: editFormData.roomId,
          arrivalDate: editFormData.arrivalDate,
          departureDate: editFormData.departureDate,
          mobileNumber: editFormData.mobileNumber || undefined,
          emailId: editFormData.emailId || undefined,
          rate: editFormData.rate,
          walkIn: editFormData.walkIn,
          remarks: editFormData.remarks || undefined,
          idProof1: editFormData.idProof1 || undefined,
          idProof2: editFormData.idProof2 || undefined,
          idProof3: editFormData.idProof3 || undefined,
          companyId: editFormData.companyId || undefined,
          planId: editFormData.planId || undefined,
          roomTypeId: editFormData.roomTypeId || undefined,
          settlementTypeId: editFormData.settlementTypeId || undefined,
          arrivalModeId: editFormData.arrivalModeId || undefined,
          arrivalDetails: editFormData.arrivalDetails || undefined,
          nationalityId: editFormData.nationalityId || undefined,
          refModeId: editFormData.refModeId || undefined,
          resvSourceId: editFormData.resvSourceId || undefined,
          includingGst: editFormData.includingGst,
          noOfPersons: editFormData.noOfPersons,
          checkout: editFormData.checkout,
        };

        console.log('Updating check-in with data:', checkInData); // Debug log

        const response = await checkInApi.updateCheckIn(editingCheckIn.folioNo, checkInData);
        console.log('Update response:', response); // Debug log
        
        if (response.data.success) {
          console.log('Update successful:', response.data.data); // Debug log
          
          // If guest name was changed, also update related advances
          if (editFormData.guestName !== editingCheckIn.guestName) {
            try {
              // Get all advances for this folio
              const advancesResponse = await advanceApi.getAdvancesByFolio(editingCheckIn.folioNo);
              if (advancesResponse.data.success && advancesResponse.data.data.length > 0) {
                // Update each advance with the new guest name
                const updatePromises = advancesResponse.data.data.map(advance => {
                  if (advance.receiptNo) {
                    return advanceApi.updateAdvance(advance.receiptNo, {
                      ...advance,
                      guestName: editFormData.guestName
                    });
                  }
                  return Promise.resolve();
                });
                
                // Wait for all updates to complete
                await Promise.all(updatePromises);
              }
            } catch (advanceError) {
              console.error('Error updating advances with new guest name:', advanceError);
              // Don't fail the check-in update if advance updates fail
            }
          }
          
          // Use Modal for success message
          setModalTitle("Success");
          setModalMessage("Check-in details updated successfully!");
          setModalType('success');
          setModalOpen(true);
          setEditingCheckIn(null);
          setEditFormTab('basic'); // Reset tab to basic
          
          // Refresh the appropriate guest list
          if (editFormData.checkout) {
            fetchCheckedOutGuests();
          } else {
            fetchInHouseGuests();
          }
        } else {
          throw new Error(response.data.message || 'Failed to update check-in details');
        }
      }
    } catch (error: any) {
      console.error('Update error:', error); // Debug log
      
      // Handle 401 errors specifically
      if (isUnauthorizedError(error)) {
        // Let the AuthContext handle the unauthorized error
        handleUnauthorizedError();
        return;
      }
      
      const errorMessage = handleApiError(error);
      
      // Use Modal for error message
      setModalTitle("Error");
      setModalMessage(`Error: ${errorMessage}`);
      setModalType('error');
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCheckIn(null);
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchAvailableRooms();
    fetchAllRooms();
    if (formData.reservationNo) {
      fetchAdvances();
    }
    // Fetch in-house guests and checked-out guests when component mounts
    fetchInHouseGuests();
    fetchCheckedOutGuests();
  }, [formData.reservationNo]);

  // Fetch available rooms when editing check-in
  useEffect(() => {
    if (editingCheckIn && availableRooms.length === 0) {
      fetchAvailableRooms();
      fetchAllRooms();
    }
  }, [editingCheckIn]);

  // Cleanup effect to clear any pending timeouts
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Validate reservation on load if there's a reservation number
  useEffect(() => {
    if (formData.reservationNo && !isWalkIn) {
      fetchReservationInfo(formData.reservationNo);
    }
  }, []);

  // Clear reservation info when switching to walk-in mode
  useEffect(() => {
    if (isWalkIn) {
      setReservationInfo(null);
    } else if (formData.reservationNo) {
      fetchReservationInfo(formData.reservationNo);
    }
  }, [isWalkIn]);

  // Calculate number of days when dates change in main form
  useEffect(() => {
    if (formData.arrivalDate && formData.departureDate) {
      const arrival = new Date(formData.arrivalDate);
      const departure = new Date(formData.departureDate);
      
      // Check if dates are valid
      if (!isNaN(arrival.getTime()) && !isNaN(departure.getTime()) && departure >= arrival) {
        const diffTime = departure.getTime() - arrival.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setFormData(prev => ({ ...prev, noOfDays: diffDays > 0 ? diffDays : 1 }));
      }
    }
  }, [formData.arrivalDate, formData.departureDate]);
  
  // Calculate number of days when dates change in edit form
  useEffect(() => {
    if (editFormData.arrivalDate && editFormData.departureDate) {
      const arrival = new Date(editFormData.arrivalDate);
      const departure = new Date(editFormData.departureDate);
      
      // Check if dates are valid
      if (!isNaN(arrival.getTime()) && !isNaN(departure.getTime()) && departure >= arrival) {
        const diffTime = departure.getTime() - arrival.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setEditFormData(prev => ({ ...prev, noOfDays: diffDays > 0 ? diffDays : 1 }));
      }
    }
  }, [editFormData.arrivalDate, editFormData.departureDate]);

  // Fetch master data on component mount and when additional tab is opened
  useEffect(() => {
    if (activeTab === 'additional' && !masterDataFetched) {
      fetchMasterData();
    }
  }, [activeTab, masterDataFetched]);

  // Fetch master data
  const fetchMasterData = async () => {
    setMasterDataLoading(true);
    try {
      // Fetch all master data in parallel
      const [
        roomTypesRes,
        companiesRes,
        planTypesRes,
        settlementTypesRes,
        arrivalModesRes,
        nationalitiesRes,
        refModesRes,
        reservationSourcesRes
      ] = await Promise.all([
        masterDataApi.getRoomTypes(),
        masterDataApi.getCompanies(),
        masterDataApi.getPlanTypes(),
        masterDataApi.getSettlementTypes(),
        masterDataApi.getArrivalModes(),
        masterDataApi.getNationalities(),
        masterDataApi.getRefModes(),
        masterDataApi.getReservationSources()
      ]);

      // Set data for successful requests
      if (roomTypesRes.data.success) {
        setRoomTypes(roomTypesRes.data.data);
      }
      
      if (companiesRes.data.success) {
        setCompanies(companiesRes.data.data);
      }
      
      if (planTypesRes.data.success) {
        setPlanTypes(planTypesRes.data.data);
      }
      
      if (settlementTypesRes.data.success) {
        setSettlementTypes(settlementTypesRes.data.data);
      }
      
      if (arrivalModesRes.data.success) {
        setArrivalModes(arrivalModesRes.data.data);
      }
      
      if (nationalitiesRes.data.success) {
        setNationalities(nationalitiesRes.data.data);
      }
      
      if (refModesRes.data.success) {
        setRefModes(refModesRes.data.data);
      }
      
      if (reservationSourcesRes.data.success) {
        setReservationSources(reservationSourcesRes.data.data);
      }
      
    } catch (error) {
      console.error('Failed to fetch master data:', error);
      showNotification('Failed to fetch master data. Please try again.', false);
    } finally {
      setMasterDataLoading(false);
      setMasterDataFetched(true);
    }
  };

  // Fetch available rooms
  const fetchAvailableRooms = async () => {
    setRoomsLoading(true);
    try {
      const response = await roomApi.getAvailableRooms();
      if (response.data.success) {
        setAvailableRooms(response.data.data);
      }
    } catch (error) {
      showNotification('Failed to fetch available rooms. Please try again.', false);
    } finally {
      setRoomsLoading(false);
    }
  };

  // Fetch all rooms
  const fetchAllRooms = async () => {
    setRoomsLoading(true);
    try {
      const response = await roomApi.getAllRooms();
      if (response.data.success) {
        setAllRooms(response.data.data);
      }
    } catch (error) {
      showNotification('Failed to fetch all rooms. Please try again.', false);
    } finally {
      setRoomsLoading(false);
    }
  };

  // Fetch advances
  const fetchAdvances = async () => {
    setAutoFillLoading(true);
    try {
      const response = await advanceApi.getAdvancesByReservation(formData.reservationNo);
      if (response.data.success) {
        setAdvances(response.data.data);
      }
    } catch (error) {
      showNotification('Failed to fetch advances. Please try again.', false);
    } finally {
      setAutoFillLoading(false);
    }
  };

  // Fetch reservation info
  const fetchReservationInfo = async (reservationNo: string) => {
    if (!reservationNo) {
      setReservationInfo(null);
      return;
    }
    
    try {
      const response = await reservationApi.searchReservations(reservationNo);
      if (response.data.success && response.data.data.length > 0) {
        const reservation = response.data.data.find((r: any) => 
          r.reservationNo === reservationNo
        );
        
        if (reservation) {
          setReservationInfo(reservation);
        } else {
          setReservationInfo(null);
        }
      } else {
        setReservationInfo(null);
      }
    } catch (error) {
      showNotification('Failed to fetch reservation info. Please try again.', false);
      setReservationInfo(null);
    }
  };

  // Auto-fill guest name based on reservation number
  const autoFillGuestName = async (reservationNo: string) => {
    if (!reservationNo) {
      setFormData(prev => ({ ...prev, guestName: '' }));
      setReservationInfo(null);
      return;
    }
    
    // Fetch reservation info
    setAutoFillLoading(true);
    try {
      const response = await reservationApi.searchReservations(reservationNo.trim());
      if (response.data.success && response.data.data.length > 0) {
        // Find the exact match for the reservation number
        const reservation = response.data.data.find((r: any) => 
          r.reservationNo.toLowerCase() === reservationNo.trim().toLowerCase()
        );
        if (reservation) {
          // Debug: Log the reservation data to see what fields are available
          console.log('Reservation data:', reservation);
          
          // Calculate number of days
          const arrivalDate = new Date(reservation.arrivalDate);
          const departureDate = new Date(reservation.departureDate);
          const timeDiff = departureDate.getTime() - arrivalDate.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          setFormData(prev => ({
            ...prev,
            guestName: reservation.guestName,
            arrivalDate: reservation.arrivalDate || '',
            departureDate: reservation.departureDate || '',
            noOfDays: daysDiff > 0 ? daysDiff : 1,
            noOfPersons: reservation.noOfPersons || 1,
            mobileNumber: reservation.mobileNumber || '',
            rate: reservation.rate || 0,
            includingGst: (reservation.includingGst || 'N') as 'Y' | 'N',
            remarks: reservation.remarks || '',
            // Additional details from reservation
            emailId: reservation.emailId || '',
            idProof1: reservation.idProof1 || '',
            idProof2: reservation.idProof2 || '',
            idProof3: reservation.idProof3 || '',
            companyId: reservation.companyId || '',
            planId: reservation.planId || '',
            roomTypeId: reservation.roomTypeId || '',
            settlementTypeId: reservation.settlementTypeId || '',
            arrivalModeId: reservation.arrivalModeId || '',
            arrivalDetails: reservation.arrivalDetails || '',
            nationalityId: reservation.nationalityId || '',
            refModeId: reservation.refModeId || '',
            resvSourceId: (reservation as any).resvSourceId || reservation.reservationSourceId || ''
          }));
        } else {
          setFormData(prev => ({ ...prev, guestName: '' }));
        }
      } else {
        setFormData(prev => ({ ...prev, guestName: '' }));
      }
    } catch (error) {
      console.error('Error in autoFillGuestName:', error);
      showNotification('Failed to auto-fill guest name. Please try again.', false);
      setFormData(prev => ({ ...prev, guestName: '' }));
    } finally {
      setAutoFillLoading(false);
    }
  };

  // Check if a reservation can accept more check-ins
  const canCheckInToReservation = async (reservationNo: string): Promise<{ canCheckIn: boolean; message?: string }> => {
    try {
      const response = await reservationApi.searchReservations(reservationNo);
      if (response.data.success && response.data.data.length > 0) {
        const reservation = response.data.data.find((r: any) => 
          r.reservationNo === reservationNo
        );
        
        if (reservation) {
          const roomsCheckedIn = reservation.roomsCheckedIn || 0;
          const noOfRooms = reservation.noOfRooms || 0;
          
          if (roomsCheckedIn >= noOfRooms) {
            return { 
              canCheckIn: false, 
              message: `All ${noOfRooms} rooms for this reservation have already been checked in. No more check-ins allowed.` 
            };
          }
          
          return { canCheckIn: true };
        }
      }
      
      return { 
        canCheckIn: false, 
        message: 'Reservation not found.' 
      };
    } catch (error) {
      showNotification('Failed to validate reservation. Please try again.', false);
      return { 
        canCheckIn: false, 
        message: 'Failed to validate reservation. Please try again.' 
      };
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Prevent manual editing of noOfDays as it's auto-calculated
    if (name === 'noOfDays') {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : 
               name === 'includingGst' ? value as 'Y' | 'N' : value,
    }));
    
    // Auto-fill guest name and fetch reservation info when reservation number changes with debouncing
    if (name === 'reservationNo' && !isWalkIn) {
      // Clear previous timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      // Set new timeout
      debounceRef.current = setTimeout(() => {
        autoFillGuestName(value);
        // Check if rooms are already assigned
        checkRoomsAssigned(value);
      }, 300); // 300ms debounce
    }
  };

  // Check if rooms are already assigned for a reservation
  const checkRoomsAssigned = async (reservationNo: string) => {
    if (!reservationNo) return;
    
    try {
      const response = await reservationApi.searchReservations(reservationNo);
      if (response.data.success && response.data.data.length > 0) {
        const reservation = response.data.data.find((r: any) => 
          r.reservationNo === reservationNo
        );
        
        if (reservation) {
          const roomsCheckedIn = reservation.roomsCheckedIn || 0;
          const noOfRooms = reservation.noOfRooms || 0;
          
          if (roomsCheckedIn >= noOfRooms) {
            showNotification(`All ${noOfRooms} rooms for this reservation have already been assigned.`, false);
          }
        }
      }
    } catch (error) {
      showNotification('Failed to check room assignment. Please try again.', false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.guestName.trim()) {
        setModalTitle("Validation Error");
        setModalMessage("Please enter a guest name or select a valid reservation number");
        setModalType('warning');
        setModalOpen(true);
        setLoading(false);
        return;
      }
      
      if (!formData.roomId) {
        setModalTitle("Validation Error");
        setModalMessage("Please select a room");
        setModalType('warning');
        setModalOpen(true);
        setLoading(false);
        return;
      }

      // For reservation-based check-ins, validate roomsCheckedIn count
      if (!isWalkIn && formData.reservationNo) {
        const validation = await canCheckInToReservation(formData.reservationNo);
        if (!validation.canCheckIn) {
          setModalTitle("Check-In Not Allowed");
          setModalMessage(validation.message || 'Cannot check in to this reservation.');
          setModalType('warning');
          setModalOpen(true);
          setLoading(false);
          return;
        }
      }

      const checkInData = {
        reservationNo: isWalkIn ? undefined : formData.reservationNo,
        guestName: formData.guestName,
        roomId: formData.roomId,
        arrivalDate: formData.arrivalDate,
        departureDate: formData.departureDate,
        mobileNumber: formData.mobileNumber,
        emailId: formData.emailId,
        rate: formData.rate,
        walkIn: isWalkIn ? 'Y' as const : 'N' as const,
        remarks: formData.remarks,
        idProof1: formData.idProof1,
        idProof2: formData.idProof2,
        idProof3: formData.idProof3,
        companyId: formData.companyId,
        planId: formData.planId,
        roomTypeId: formData.roomTypeId,
        settlementTypeId: formData.settlementTypeId,
        arrivalModeId: formData.arrivalModeId,
        arrivalDetails: formData.arrivalDetails,
        nationalityId: formData.nationalityId,
        refModeId: formData.refModeId,
        resvSourceId: formData.resvSourceId,
        includingGst: formData.includingGst,
        noOfPersons: formData.noOfPersons,
        checkout: false,
      };

      const response = await checkInApi.processCheckIn(checkInData);
      
      if (response.data.success) {
        // If this was a reservation-based check-in, update the roomsCheckedIn count
        if (!isWalkIn && formData.reservationNo) {
          try {
            // Get the current reservation to update roomsCheckedIn
            const reservationResponse = await reservationApi.searchReservations(formData.reservationNo);
            if (reservationResponse.data.success && reservationResponse.data.data.length > 0) {
              const reservation = reservationResponse.data.data.find((r: any) => 
                r.reservationNo === formData.reservationNo
              );
              
              if (reservation) {
                const currentRoomsCheckedIn = reservation.roomsCheckedIn || 0;
                // Update the reservation with incremented roomsCheckedIn count
                await reservationApi.updateRoomsCheckedIn(
                  formData.reservationNo, 
                  currentRoomsCheckedIn + 1
                );
              }
            }
          } catch (error) {
            setModalTitle("Warning");
            setModalMessage("Failed to update reservation count, but check-in was successful.");
            setModalType('warning');
            setModalOpen(true);
            // Don't fail the check-in if we can't update the reservation count
          }
        }
        
        setModalTitle("Check-In Successful");
        setModalMessage("Check-in processed successfully!");
        setModalType('success');
        setModalAction(() => {
          // Reset form
          setFormData({
            reservationNo: '',
            guestName: '',
            arrivalDate: '',
            departureDate: '',
            noOfDays: 1,
            noOfPersons: 1,
            mobileNumber: '',
            rate: 0,
            roomId: '',
            remarks: '',
            includingGst: 'Y' as 'Y' | 'N',
            // Additional details fields
            emailId: '',
            idProof1: '',
            idProof2: '',
            idProof3: '',
            companyId: '',
            planId: '',
            roomTypeId: '',
            settlementTypeId: '',
            arrivalModeId: '',
            arrivalDetails: '',
            nationalityId: '',
            refModeId: '',
            resvSourceId: '',
          });
          setAdvances([]); // Clear advances as well
          return null;
        });
        setModalOpen(true);
      }
    } catch (error: any) {
      // Handle 401 errors specifically
      if (isUnauthorizedError(error)) {
        // Let the AuthContext handle the unauthorized error
        handleUnauthorizedError();
        return;
      }
      
      const errorMessage = handleApiError(error);
      
      setModalTitle("Error");
      setModalMessage(`Error: ${errorMessage}`);
      setModalType('error');
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle clear form
  const handleClear = () => {
    setFormData({
      reservationNo: '',
      guestName: '',
      arrivalDate: '',
      departureDate: '',
      noOfDays: 1,
      noOfPersons: 1,
      mobileNumber: '',
      rate: 0,
      roomId: '',
      remarks: '',
      includingGst: 'Y' as 'Y' | 'N',
      // Additional details fields
      emailId: '',
      idProof1: '',
      idProof2: '',
      idProof3: '',
      companyId: '',
      planId: '',
      roomTypeId: '',
      settlementTypeId: '',
      arrivalModeId: '',
      arrivalDetails: '',
      nationalityId: '',
      refModeId: '',
      resvSourceId: '',
    });
    setAdvances([]);
    setReservationInfo(null);
    // Reset walk-in state to false
    setIsWalkIn(false);
    // Clear any pending debounced calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // Reset auto-fill loading state
    setAutoFillLoading(false);
    // Clear notifications
    setSuccessMessage('');
    setErrorMessage('');
    // Reset master data fetch state
    setMasterDataFetched(false);
  };

  // Render a dropdown with consistent loading and error handling
  const renderDropdown = (
    name: string,
    label: string,
    options: any[],
    valueKey: string,
    labelKey: string,
    placeholder: string = `Select ${label}`
  ) => {
    const value = formData[name as keyof typeof formData];
    return (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
        <select
          name={name}
          value={value !== undefined && value !== null && typeof value !== 'boolean' ? value.toString() : ''}
          onChange={handleInputChange}
          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
          disabled={masterDataLoading}
        >
          <option value="">{masterDataLoading ? 'Loading...' : placeholder}</option>
          {options.map((option) => (
            <option key={option[valueKey]} value={option[valueKey]}>
              {option[labelKey]}
            </option>
          ))}
        </select>
      </div>
    );
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Check-In Guest</h1>
          <div className="text-sm text-gray-500">
            Process guest arrivals and update room statuses.
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

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Check-in Form */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                  Check-In Guest
                </h2>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <span className="text-sm font-medium text-gray-700">Walk-In Guest</span>
                    <div
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isWalkIn ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      onClick={() => setIsWalkIn(!isWalkIn)}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isWalkIn ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 bg-gray-50 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('basic')}
                  className={`px-4 py-3 text-xs font-medium flex-1 text-center transition-colors ${
                    activeTab === 'basic'
                      ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Basic Information
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('additional')}
                  className={`px-4 py-3 text-xs font-medium flex-1 text-center transition-colors ${
                    activeTab === 'additional'
                      ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    Additional Details
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'basic' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {/* Reservation Number */}
                  {!isWalkIn && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Reservation Number
                      </label>
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            name="reservationNo"
                            value={formData.reservationNo}
                            onChange={handleInputChange}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                            placeholder="Enter reservation number or select from list"
                          />
                          {autoFillLoading && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReservationModalOpen(true);
                            fetchAllReservations();
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                          Select
                        </button>
                      </div>
                      {/* Auto-fill loading message */}
                      {autoFillLoading && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100 flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          <span className="text-xs text-blue-700">Please wait, searching data...</span>
                        </div>
                      )}
                      {/* Reservation Info Display */}
                      {reservationInfo && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs font-medium text-blue-800">{reservationInfo.guestName}</p>
                              <p className="text-xs text-blue-600">
                                Rooms: {reservationInfo.noOfRooms} | 
                                Checked In: {reservationInfo.roomsCheckedIn || 0} | 
                                Remaining: {reservationInfo.noOfRooms - (reservationInfo.roomsCheckedIn || 0)}
                              </p>
                            </div>
                            <div>
                              {reservationInfo.roomsCheckedIn >= reservationInfo.noOfRooms ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Full
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Available
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Guest Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Guest Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="guestName"
                        required
                        value={formData.guestName}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      />
                      {autoFillLoading && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrival Date */}
                  <DateInput 
                    name="arrivalDate"
                    value={formData.arrivalDate}
                    onChange={handleInputChange}
                    label="Arrival Date"
                    required
                  />

                  {/* Departure Date */}
                  <DateInput 
                    name="departureDate"
                    value={formData.departureDate}
                    onChange={handleInputChange}
                    label="Departure Date"
                    required
                  />

                  {/* No of Days */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      No of Days
                    </label>
                    <input
                      type="number"
                      name="noOfDays"
                      min="1"
                      value={formData.noOfDays}
                      readOnly
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-xs"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
                  </div>

                  {/* No of Persons */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      No of Persons
                    </label>
                    <input
                      type="number"
                      name="noOfPersons"
                      min="1"
                      value={formData.noOfPersons}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    />
                  </div>

                  {/* Email ID */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email ID
                    </label>
                    <input
                      type="email"
                      name="emailId"
                      value={formData.emailId}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Rate */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Rate (₹)
                    </label>
                    <input
                      type="number"
                      name="rate"
                      value={formData.rate}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    />
                  </div>

                  {/* Including GST Field */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Including GST</label>
                    <select
                      name="includingGst"
                      value={formData.includingGst}
                      onChange={(e) => setFormData(prev => ({ ...prev, includingGst: e.target.value as 'Y' | 'N' }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    >
                      <option value="Y">Y</option>
                      <option value="N">N</option>
                    </select>
                  </div>

                  {/* Remarks */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Remarks
                    </label>
                    <textarea
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="Any special requests or notes"
                    />
                  </div>

                  {/* Room Selection */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Room Number <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="roomId"
                      required
                      value={formData.roomId}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    >
                      <option value="">Select a vacant room</option>
                      {availableRooms.map(room => (
                        <option key={room.roomId} value={room.roomId}>
                          Room {room.roomNo} - {room.roomTypeName || 'Standard'}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Note: For walk-in guests, room status will automatically update to "OD (Occupied Dirty)" upon check-in.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  {/* Additional Details Fields */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ID Proof 1</label>
                    <input
                      type="text"
                      name="idProof1"
                      value={formData.idProof1}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="e.g., Passport: P12345678"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ID Proof 2</label>
                    <input
                      type="text"
                      name="idProof2"
                      value={formData.idProof2}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="e.g., Driving License: DL987654321"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">ID Proof 3</label>
                    <input
                      type="text"
                      name="idProof3"
                      value={formData.idProof3}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="e.g., Aadhar Card: 1234-5678-9012"
                    />
                  </div>
                  
                  {/* Company Dropdown */}
                  {renderDropdown("companyId", "Company", companies, "companyId", "companyName", "Select Company")}
                  
                  {/* Plan Type Dropdown */}
                  {renderDropdown("planId", "Plan Type", planTypes, "planId", "planName", "Select Plan")}
                  
                  {/* Room Type Dropdown */}
                  {renderDropdown("roomTypeId", "Room Type", roomTypes, "typeId", "typeName", "Select Room Type")}
                  
                  {/* Settlement Type Dropdown */}
                  {renderDropdown("settlementTypeId", "Settlement Type", settlementTypes, "id", "name", "Select Settlement Type")}
                  
                  {/* Arrival Mode Dropdown */}
                  {renderDropdown("arrivalModeId", "Arrival Mode", arrivalModes, "id", "arrivalMode", "Select Arrival Mode")}
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Arrival Details</label>
                    <input
                      type="text"
                      name="arrivalDetails"
                      value={formData.arrivalDetails}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      placeholder="e.g., Flight AA123 at 14:30"
                    />
                  </div>
                  
                  {/* Nationality Dropdown */}
                  {renderDropdown("nationalityId", "Nationality", nationalities, "id", "nationality", "Select Nationality")}
                  
                  {/* Ref Mode Dropdown */}
                  {renderDropdown("refModeId", "Ref Mode", refModes, "id", "refMode", "Select Ref Mode")}
                  
                  {/* Reservation Source Dropdown */}
                  {renderDropdown("resvSourceId", "Reservation Source", reservationSources, "id", "resvSource", "Select Reservation Source")}
                </div>
              )}

              {/* Form Actions */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleClear}
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
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-xs font-medium flex items-center shadow-md"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      Check-In
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Advance Details Sidebar */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Advance Details
              </h3>
              <p className="text-sm text-gray-600 mt-1 ml-7">
                Payments recorded for this reservation or folio.
              </p>
            </div>

            <div className="p-4 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
              {advances.length > 0 ? (
                advances.map((advance, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-base font-semibold text-green-600">
                        ₹ {advance.amount.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">{advance.date}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>{advance.modeOfPaymentName || advance.modeOfPaymentId}</span>
                    </div>
                    <p className="text-xs text-gray-500">{advance.narration || advance.remarks}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No advance payments found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manage Check-ins Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mt-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Manage Check-ins
            </h2>
            <p className="text-sm text-gray-600 mt-1 ml-7">
              Edit existing check-in records
            </p>
          </div>
          
          {/* Tabs for in-house and checked-out guests */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => {
                setManageCheckInsTab('inhouse');
                setFilteredGuests(inHouseGuests);
              }}
              className={`px-4 py-3 text-xs font-medium flex-1 text-center transition-colors ${
                manageCheckInsTab === 'inhouse'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                In-House Guests
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setManageCheckInsTab('checkedout');
                setFilteredGuests(checkedOutGuests);
                // Fetch checked-out guests if not already fetched
                if (checkedOutGuests.length === 0) {
                  fetchCheckedOutGuests();
                }
              }}
              className={`px-4 py-3 text-xs font-medium flex-1 text-center transition-colors ${
                manageCheckInsTab === 'checkedout'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                Checked Out Guests
              </div>
            </button>
          </div>

          <div className="p-4">
            {/* Enhanced Search Form */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Folio No</label>
                  <input
                    type="text"
                    placeholder="Enter folio number"
                    value={folioNoSearch}
                    onChange={(e) => setFolioNoSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Room No</label>
                  <input
                    type="text"
                    placeholder="Enter room number"
                    value={roomNoSearch}
                    onChange={(e) => setRoomNoSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Guest Name</label>
                  <input
                    type="text"
                    placeholder="Enter guest name"
                    value={guestNameSearch}
                    onChange={(e) => setGuestNameSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Arrival Date</label>
                  <input
                    type="date"
                    value={arrivalDateSearch}
                    onChange={(e) => setArrivalDateSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Departure Date</label>
                  <input
                    type="date"
                    value={departureDateSearch}
                    onChange={(e) => setDepartureDateSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={searchCheckInsWithCriteria}
                    disabled={searchLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center"
                  >
                    {searchLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        Search
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearSearch}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Folio No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    {manageCheckInsTab === 'checkedout' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checkout Date</th>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGuests.length > 0 ? (
                    filteredGuests.map((checkIn) => (
                      <tr key={checkIn.folioNo} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{checkIn.folioNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{checkIn.guestName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getRoomNoByIdWithFallback(checkIn.roomId, checkIn.roomNo)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {checkIn.arrivalDate ? new Date(checkIn.arrivalDate).toLocaleDateString('en-GB') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {checkIn.departureDate ? new Date(checkIn.departureDate).toLocaleDateString('en-GB') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            checkIn.checkout ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {checkIn.checkout ? 'Checked Out' : 'In-House'}
                          </span>
                        </td>
                        {manageCheckInsTab === 'checkedout' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {checkIn.auditDate ? new Date(checkIn.auditDate).toLocaleDateString('en-GB') : 'N/A'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditCheckIn(checkIn)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={manageCheckInsTab === 'inhouse' ? 7 : 8} className="px-6 py-4 text-center text-sm text-gray-500">
                        {searchLoading ? (
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                            Searching...
                          </div>
                        ) : (
                          manageCheckInsTab === 'inhouse' ? 'No in-house guests found' : 'No checked-out guests found'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {/* Reservation Selection Modal */}
      {reservationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Select Reservation</h3>
              <button
                onClick={() => setReservationModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search by reservation number, guest name, or dates..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={reservationSearchTerm}
                    onChange={(e) => setReservationSearchTerm(e.target.value)}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Showing {filteredReservations.length} of {reservations.length} reservations
                </div>
              </div>
              {reservationSearchTerm && (
                <div className="mt-2 text-xs text-gray-500">
                  Search results for: "{reservationSearchTerm}"
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {reservationsLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredReservations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reservation No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rooms</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredReservations.map((reservation) => {
                        const roomsCheckedIn = reservation.roomsCheckedIn || 0;
                        const noOfRooms = reservation.noOfRooms || 0;
                        const remainingRooms = noOfRooms - roomsCheckedIn;
                        
                        return (
                          <tr key={reservation.reservationNo} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reservation.reservationNo}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reservation.guestName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(reservation.arrivalDate).toLocaleDateString('en-GB')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(reservation.departureDate).toLocaleDateString('en-GB')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {noOfRooms} ({roomsCheckedIn} checked in)
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${remainingRooms > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {remainingRooms > 0 ? `${remainingRooms} available` : 'Full'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleSelectReservation(reservation)}
                                disabled={remainingRooms <= 0}
                                className={`px-3 py-1 rounded-md text-xs ${remainingRooms > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No reservations found matching your search</p>
                  <p className="mt-1 text-xs text-gray-400">Try adjusting your search criteria</p>
                </div>
              )}
            </div>
            
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setReservationModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Check-in Modal */}
      {editingCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Edit Check-in Details</h3>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleUpdateCheckIn} className="flex-1 overflow-y-auto">
              {/* Warning for checked-out guests */}
              {editFormData.checkout && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        This guest has already checked out. You can still edit their details.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tabs */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setEditFormTab('basic')}
                  className={`px-4 py-3 text-xs font-medium flex-1 text-center transition-colors ${
                    editFormTab === 'basic'
                      ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Basic Information
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setEditFormTab('additional')}
                  className={`px-4 py-3 text-xs font-medium flex-1 text-center transition-colors ${
                    editFormTab === 'additional'
                      ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    Additional Details
                  </div>
                </button>
              </div>
              
              <div className="p-4">
                {editFormTab === 'basic' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Guest Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Guest Name
                      </label>
                      <input
                        type="text"
                        name="guestName"
                        value={editFormData.guestName}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                        required
                      />
                    </div>
                    
                    {/* Room Selection */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Room Number
                      </label>
                      {/* Display current room number as non-editable field */}
                      <div className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-gray-100">
                        {roomsLoading ? 'Loading...' : `Room ${getRoomNoByIdWithFallback(editFormData.roomId)}`}
                      </div>
                      {/* Hidden input to maintain roomId value during form submission */}
                      <input
                        type="hidden"
                        name="roomId"
                        value={editFormData.roomId}
                      />
                    </div>
                    
                    {/* Arrival Date */}
                    <DateInput 
                      name="arrivalDate"
                      value={editFormData.arrivalDate}
                      onChange={handleEditFormChange}
                      label="Arrival Date"
                    />
                    
                    {/* Departure Date */}
                    <DateInput 
                      name="departureDate"
                      value={editFormData.departureDate}
                      onChange={handleEditFormChange}
                      label="Departure Date"
                    />
                    
                    {/* Mobile Number */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        name="mobileNumber"
                        value={editFormData.mobileNumber}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      />
                    </div>
                    
                    {/* Email ID */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email ID
                      </label>
                      <input
                        type="email"
                        name="emailId"
                        value={editFormData.emailId}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      />
                    </div>
                    
                    {/* Rate */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Rate (₹)
                      </label>
                      <input
                        type="number"
                        name="rate"
                        min="0"
                        value={editFormData.rate}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      />
                    </div>
                    
                    {/* No of Days */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        No of Days
                      </label>
                      <input
                        type="number"
                        name="noOfDays"
                        min="1"
                        value={editFormData.noOfDays || 1}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      />
                    </div>
                    
                    {/* No of Persons */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        No of Persons
                      </label>
                      <input
                        type="number"
                        name="noOfPersons"
                        min="1"
                        value={editFormData.noOfPersons || 1}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      />
                    </div>
                    
                    {/* Reservation Number */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Reservation Number
                      </label>
                      <input
                        type="text"
                        name="reservationNo"
                        value={editFormData.reservationNo}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      />
                    </div>
                    
                    {/* Walk-In Toggle */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Walk-In Guest
                      </label>
                      <select
                        name="walkIn"
                        value={editFormData.walkIn}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      >
                        <option value="N">No</option>
                        <option value="Y">Yes</option>
                      </select>
                    </div>
                    
                    {/* Remarks */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Remarks
                      </label>
                      <textarea
                        name="remarks"
                        value={editFormData.remarks}
                        onChange={handleEditFormChange}
                        rows={2}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      />
                    </div>
                    
                    {/* Including GST Field */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Including GST</label>
                      <select
                        name="includingGst"
                        value={editFormData.includingGst}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      >
                        <option value="N">No</option>
                        <option value="Y">Yes</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Company Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                      <select
                        name="companyId"
                        value={editFormData.companyId}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      >
                        <option value="">Select Company</option>
                        {companies.map((company) => (
                          <option key={company.companyId} value={company.companyId}>
                            {company.companyName}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Plan Type Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Plan Type</label>
                      <select
                        name="planId"
                        value={editFormData.planId}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      >
                        <option value="">Select Plan</option>
                        {planTypes.map((plan) => (
                          <option key={plan.planId} value={plan.planId}>
                            {plan.planName}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Room Type Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Room Type</label>
                      <select
                        name="roomTypeId"
                        value={editFormData.roomTypeId}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      >
                        <option value="">Select Room Type</option>
                        {roomTypes.map((roomType) => (
                          <option key={roomType.typeId} value={roomType.typeId}>
                            {roomType.typeName}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Settlement Type Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Settlement Type</label>
                      <select
                        name="settlementTypeId"
                        value={editFormData.settlementTypeId}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      >
                        <option value="">Select Settlement Type</option>
                        {settlementTypes.map((settlement) => (
                          <option key={settlement.id} value={settlement.id}>
                            {settlement.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Arrival Mode Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Arrival Mode</label>
                      <select
                        name="arrivalModeId"
                        value={editFormData.arrivalModeId}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      >
                        <option value="">Select Arrival Mode</option>
                        {arrivalModes.map((arrivalMode) => (
                          <option key={arrivalMode.id} value={arrivalMode.id}>
                            {arrivalMode.arrivalMode}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Arrival Details */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Arrival Details</label>
                      <input
                        type="text"
                        name="arrivalDetails"
                        value={editFormData.arrivalDetails}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                        placeholder="e.g., Flight AA123 at 14:30"
                      />
                    </div>
                    
                    {/* Nationality Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nationality</label>
                      <select
                        name="nationalityId"
                        value={editFormData.nationalityId}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      >
                        <option value="">Select Nationality</option>
                        {nationalities.map((nationality) => (
                          <option key={nationality.id} value={nationality.id}>
                            {nationality.nationality}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Ref Mode Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Ref Mode</label>
                      <select
                        name="refModeId"
                        value={editFormData.refModeId}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      >
                        <option value="">Select Ref Mode</option>
                        {refModes.map((refMode) => (
                          <option key={refMode.id} value={refMode.id}>
                            {refMode.refMode}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Reservation Source Dropdown */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Reservation Source</label>
                      <select
                        name="resvSourceId"
                        value={editFormData.resvSourceId}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      >
                        <option value="">Select Reservation Source</option>
                        {reservationSources.map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.resvSource}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* No of Persons */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        No of Persons
                      </label>
                      <input
                        type="number"
                        name="noOfPersons"
                        min="1"
                        value={editFormData.noOfPersons || 1}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      />
                    </div>
                    
                    {/* ID Proofs */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        ID Proof 1
                      </label>
                      <input
                        type="text"
                        name="idProof1"
                        value={editFormData.idProof1}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        ID Proof 2
                      </label>
                      <input
                        type="text"
                        name="idProof2"
                        value={editFormData.idProof2}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        ID Proof 3
                      </label>
                      <input
                        type="text"
                        name="idProof3"
                        value={editFormData.idProof3}
                        onChange={handleEditFormChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="px-4 pt-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs font-medium"
                >
                  {loading ? 'Updating...' : 'Update Check-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
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
        {modalMessage}
      </Modal>
    </Layout>
  );
};

export default CheckIn;