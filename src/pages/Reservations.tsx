import React, { useState, useEffect } from "react";
import { Reservation, DeletedReservation, RoomType, Company, PlanType, SettlementType, ArrivalMode, Nationality, RefMode, ReservationSource } from "../types/api";
import { reservationApi, masterDataApi } from "../services/api";
import Layout from "../components/Layout/Layout";
import jsPDF from 'jspdf';
import Modal from "../components/Modal";

const Reservations: React.FC = () => {
  const [isCreating, setIsCreating] = useState(true);
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [deletedReservations, setDeletedReservations] = useState<DeletedReservation[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [planTypes, setPlanTypes] = useState<PlanType[]>([]);
  const [settlementTypes, setSettlementTypes] = useState<SettlementType[]>([]);
  const [arrivalModes, setArrivalModes] = useState<ArrivalMode[]>([]);
  const [nationalities, setNationalities] = useState<Nationality[]>([]);
  const [refModes, setRefModes] = useState<RefMode[]>([]);
  const [reservationSources, setReservationSources] = useState<ReservationSource[]>([]);
  const [activeTab, setActiveTab] = useState<"reservation" | "additional" | "deleted">("reservation");
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [masterDataLoading, setMasterDataLoading] = useState(false);
  const [masterDataError, setMasterDataError] = useState<string | null>(null);
  const [masterDataFetched, setMasterDataFetched] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // New states for filtering and pagination
  const [filterOption, setFilterOption] = useState<"all" | "today" | "week" | "month">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [totalReservations, setTotalReservations] = useState(0);

  // Function to format date from YYYY-MM-DD to DD/MM/YYYY
  const formatDateToDDMMYYYY = (dateString: string): string => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    if (parts.length !== 3) return '-';
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const [formData, setFormData] = useState({
    guestName: "",
    companyId: "",
    planId: "",
    roomTypeId: "",
    arrivalDate: "",
    departureDate: "",
    noOfDays: 1,
    noOfPersons: 1,
    noOfRooms: 1,
    mobileNumber: "",
    emailId: "",
    rate: 0, // Changed from empty string to 0 to ensure default value
    includingGst: "N" as "Y" | "N",
    remarks: "",
    idProof1: "",
    idProof2: "",
    idProof3: "",
    // Additional details
    settlementTypeId: "",
    arrivalModeId: "",
    arrivalDetails: "",
    nationalityId: "",
    refModeId: "",
    reservationSourceId: "",
  });

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

  useEffect(() => {
    if (!isCreating) {
      if (activeTab === "deleted") {
        fetchDeletedReservations();
      } else {
        fetchReservations();
      }
    }
  }, [isCreating, activeTab, filterOption, currentPage, searchTerm]);

  // Fetch master data on component mount
  useEffect(() => {
    fetchMasterData();
  }, []);

  // Ensure master data is loaded when switching to additional details tab
  useEffect(() => {
    if (activeTab === "additional" && !masterDataFetched) {
      fetchMasterData();
    }
  }, [activeTab, masterDataFetched]);

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

  const fetchMasterData = async () => {
    setMasterDataLoading(true);
    setMasterDataError(null);
    setDebugInfo(null);
    
    try {
      console.log("Fetching master data...");
      
      // Fetch data individually to identify which endpoint is failing
      const results = await Promise.allSettled([
        masterDataApi.getRoomTypes(),
        masterDataApi.getCompanies(),
        masterDataApi.getPlanTypes(),
        masterDataApi.getSettlementTypes(),
        masterDataApi.getArrivalModes(),
        masterDataApi.getNationalities(),
        masterDataApi.getRefModes(),
        masterDataApi.getReservationSources(),
      ]);

      // Process results
      const [
        roomTypesRes, 
        companiesRes, 
        planTypesRes,
        settlementTypesRes,
        arrivalModesRes,
        nationalitiesRes,
        refModesRes,
        reservationSourcesRes
      ] = results;

      // Log each result for debugging
      const debugData = {
        roomTypes: roomTypesRes.status === 'fulfilled' ? 'Success' : `Failed: ${roomTypesRes.reason}`,
        companies: companiesRes.status === 'fulfilled' ? 'Success' : `Failed: ${companiesRes.reason}`,
        planTypes: planTypesRes.status === 'fulfilled' ? 'Success' : `Failed: ${planTypesRes.reason}`,
        settlementTypes: settlementTypesRes.status === 'fulfilled' ? 'Success' : `Failed: ${settlementTypesRes.reason}`,
        arrivalModes: arrivalModesRes.status === 'fulfilled' ? 'Success' : `Failed: ${arrivalModesRes.reason}`,
        nationalities: nationalitiesRes.status === 'fulfilled' ? 'Success' : `Failed: ${nationalitiesRes.reason}`,
        refModes: refModesRes.status === 'fulfilled' ? 'Success' : `Failed: ${refModesRes.reason}`,
        reservationSources: reservationSourcesRes.status === 'fulfilled' ? 'Success' : `Failed: ${reservationSourcesRes.reason}`,
      };
      
      setDebugInfo(debugData);
      console.log("Debug info:", debugData);

      // Set data for successful requests
      if (roomTypesRes.status === 'fulfilled' && roomTypesRes.value.data.success) {
        setRoomTypes(roomTypesRes.value.data.data);
      }
      
      if (companiesRes.status === 'fulfilled' && companiesRes.value.data.success) {
        console.log("Setting companies data:", companiesRes.value.data.data);
        setCompanies(companiesRes.value.data.data);
      }
      
      if (planTypesRes.status === 'fulfilled' && planTypesRes.value.data.success) {
        setPlanTypes(planTypesRes.value.data.data);
      }
      
      if (settlementTypesRes.status === 'fulfilled' && settlementTypesRes.value.data.success) {
        setSettlementTypes(settlementTypesRes.value.data.data);
      }
      
      if (arrivalModesRes.status === 'fulfilled' && arrivalModesRes.value.data.success) {
        setArrivalModes(arrivalModesRes.value.data.data);
      }
      
      if (nationalitiesRes.status === 'fulfilled' && nationalitiesRes.value.data.success) {
        setNationalities(nationalitiesRes.value.data.data);
      }
      
      if (refModesRes.status === 'fulfilled' && refModesRes.value.data.success) {
        setRefModes(refModesRes.value.data.data);
      }
      
      if (reservationSourcesRes.status === 'fulfilled' && reservationSourcesRes.value.data.success) {
        setReservationSources(reservationSourcesRes.value.data.data);
      }
      
      // Check if any requests failed
      const hasFailures = results.some(result => result.status === 'rejected');
      if (hasFailures) {
        setMasterDataError("Some master data failed to load. Please check the debug information below.");
      }
      
      setMasterDataFetched(true);
    } catch (error: any) {
      console.error("Failed to fetch master data:", error);
      setMasterDataError("Failed to load master data. Please try again.");
      setDebugInfo({ error: error.message || "Unknown error" });
    } finally {
      setMasterDataLoading(false);
    }
  };

  const fetchReservations = async () => {
    try {
      const response = await reservationApi.getReservations();
      if (response.data.success) {
        let filteredReservations = response.data.data;
        
        // Apply search filter first
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filteredReservations = filteredReservations.filter(reservation => 
            reservation.reservationNo.toLowerCase().includes(term) ||
            reservation.guestName.toLowerCase().includes(term)
          );
        }
        
        // Then apply date filters
        if (filterOption === "today") {
          const today = new Date().toISOString().split('T')[0];
          filteredReservations = filteredReservations.filter(reservation => 
            reservation.arrivalDate === today
          );
        } else if (filterOption === "week") {
          const today = new Date();
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          filteredReservations = filteredReservations.filter(reservation => {
            const arrivalDate = new Date(reservation.arrivalDate);
            return arrivalDate >= weekStart && arrivalDate <= weekEnd;
          });
        } else if (filterOption === "month") {
          const today = new Date();
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          
          filteredReservations = filteredReservations.filter(reservation => {
            const arrivalDate = new Date(reservation.arrivalDate);
            return arrivalDate >= monthStart && arrivalDate <= monthEnd;
          });
        }
        
        setTotalReservations(filteredReservations.length);
        setReservations(filteredReservations);
      }
    } catch (error) {
      console.error("Failed to fetch reservations:", error);
    }
  };

  const fetchDeletedReservations = async () => {
    try {
      const response = await reservationApi.getDeletedReservations();
      if (response.data.success) {
        let filteredReservations = response.data.data;
        
        // Apply search filter first
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filteredReservations = filteredReservations.filter(reservation => 
            reservation.reservationNo.toLowerCase().includes(term) ||
            reservation.guestName.toLowerCase().includes(term)
          );
        }
        
        // Then apply date filters
        if (filterOption === "today") {
          const today = new Date().toISOString().split('T')[0];
          filteredReservations = filteredReservations.filter(reservation => 
            reservation.arrivalDate === today
          );
        } else if (filterOption === "week") {
          const today = new Date();
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          filteredReservations = filteredReservations.filter(reservation => {
            const arrivalDate = new Date(reservation.arrivalDate);
            return arrivalDate >= weekStart && arrivalDate <= weekEnd;
          });
        } else if (filterOption === "month") {
          const today = new Date();
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          
          filteredReservations = filteredReservations.filter(reservation => {
            const arrivalDate = new Date(reservation.arrivalDate);
            return arrivalDate >= monthStart && arrivalDate <= monthEnd;
          });
        }
        
        setTotalReservations(filteredReservations.length);
        setDeletedReservations(filteredReservations);
      }
    } catch (error) {
      console.error("Failed to fetch deleted reservations:", error);
    }
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReservations = reservations.slice(indexOfFirstItem, indexOfLastItem);
  const currentDeletedReservations = deletedReservations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil((activeTab === "deleted" ? deletedReservations.length : reservations.length) / itemsPerPage);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'rate' ? (value === '' ? 0 : Number(value)) : (type === "number" ? Number(value) : value),
    }));
  };

  // Handle key down events for proper tab navigation
  const handleKeyDown = (e: React.KeyboardEvent, nextElementName?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextElementName) {
        const nextElement = document.querySelector(`[name="${nextElementName}"]`) as HTMLElement;
        if (nextElement) {
          nextElement.focus();
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate that rate is provided
      if (formData.rate <= 0) {
        setModalTitle("Validation Error");
        setModalMessage("Rate is required and must be greater than zero.");
        setModalType('warning');
        setModalOpen(true);
        setLoading(false);
        return;
      }

      // Prepare the data for submission
      const submissionData: any = {
        ...formData,
        rate: Number(formData.rate) || 0, // Ensure rate is a number
      };

      // Handle optional fields - remove empty strings
      if (!formData.companyId) delete submissionData.companyId;
      if (!formData.planId) delete submissionData.planId;
      if (!formData.roomTypeId) delete submissionData.roomTypeId;
      if (!formData.emailId) delete submissionData.emailId;
      if (!formData.remarks) delete submissionData.remarks;
      if (!formData.settlementTypeId) delete submissionData.settlementTypeId;
      if (!formData.arrivalModeId) delete submissionData.arrivalModeId;
      if (!formData.arrivalDetails) delete submissionData.arrivalDetails;
      if (!formData.nationalityId) delete submissionData.nationalityId;
      if (!formData.refModeId) delete submissionData.refModeId;
      if (!formData.reservationSourceId) delete submissionData.reservationSourceId;

      let response;
      if (editingReservation) {
        // Update existing reservation
        response = await reservationApi.updateReservation(editingReservation.reservationNo, submissionData);
      } else {
        // Create new reservation
        response = await reservationApi.createReservation(submissionData);
      }

      if (response.data.success) {
        setModalTitle(editingReservation ? "Reservation Updated" : "Reservation Created");
        setModalMessage(editingReservation ? "Reservation updated successfully!" : "Reservation created successfully!");
        setModalType('success');
        setModalAction(() => {
          handleClear();
          if (!isCreating) {
            fetchReservations(); // Refresh the reservations list
          }
          return null;
        });
        setModalOpen(true);
      }
    } catch (error: any) {
      setModalTitle("Error");
      setModalMessage(
        `Error: ${
          error.response?.data?.message || (editingReservation ? "Failed to update reservation" : "Failed to create reservation")
        }`
      );
      setModalType('error');
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setFormData({
      guestName: reservation.guestName || "",
      companyId: reservation.companyId || "",
      planId: reservation.planId || "",
      roomTypeId: reservation.roomTypeId || "",
      arrivalDate: reservation.arrivalDate || "",
      departureDate: reservation.departureDate || "",
      noOfDays: reservation.noOfDays || 1,
      noOfPersons: reservation.noOfPersons || 1,
      noOfRooms: reservation.noOfRooms || 1,
      mobileNumber: reservation.mobileNumber || "",
      emailId: reservation.emailId || "",
      rate: reservation.rate || 0, // Changed from string conversion to number with default 0
      includingGst: (reservation.includingGst as "Y" | "N") || "N",
      remarks: reservation.remarks || "",
      idProof1: reservation.idProof1 || "",
      idProof2: reservation.idProof2 || "",
      idProof3: reservation.idProof3 || "",
      // Additional details
      settlementTypeId: reservation.settlementTypeId || "",
      arrivalModeId: reservation.arrivalModeId || "",
      arrivalDetails: reservation.arrivalDetails || "",
      nationalityId: reservation.nationalityId || "",
      refModeId: reservation.refModeId || "",
      reservationSourceId: (reservation as any).resvSourceId || reservation.reservationSourceId || "",
    });
    setIsCreating(true);
    setActiveTab("reservation");
  };

  const handleDelete = async (reservationId: string) => {
    setModalTitle("Confirm Deletion");
    setModalMessage("Are you sure you want to delete this reservation?");
    setModalType('warning');
    setConfirmText("Delete");
    setCancelText("Cancel");
    setShowConfirmButton(true);
    setShowCancelButton(true);
    
    setModalAction(() => () => {
      handleDeleteConfirmed(reservationId);
    });
    
    setModalOpen(true);
  };

  const handleDeleteConfirmed = async (reservationId: string) => {
    try {
      const response = await reservationApi.deleteReservation(reservationId);
      if (response.data.success) {
        setModalTitle("Reservation Deleted");
        setModalMessage("Reservation deleted successfully!");
        setModalType('success');
        setModalAction(() => {
          fetchReservations(); // Refresh the reservations list
          return null;
        });
        setModalOpen(true);
      }
    } catch (error: any) {
      setModalTitle("Error");
      setModalMessage(
        `Error: ${
          error.response?.data?.message || "Failed to delete reservation"
        }`
      );
      setModalType('error');
      setModalOpen(true);
    }
  };

  const handleRestore = async (reservationId: string) => {
    setModalTitle("Confirm Restoration");
    setModalMessage("Are you sure you want to restore this reservation?");
    setModalType('warning');
    setConfirmText("Restore");
    setCancelText("Cancel");
    setShowConfirmButton(true);
    setShowCancelButton(true);
    
    setModalAction(() => () => {
      handleRestoreConfirmed(reservationId);
    });
    
    setModalOpen(true);
  };

  const handleRestoreConfirmed = async (reservationId: string) => {
    try {
      const response = await reservationApi.restoreReservation(reservationId);
      if (response.data.success) {
        setModalTitle("Reservation Restored");
        setModalMessage("Reservation restored successfully!");
        setModalType('success');
        setModalAction(() => {
          fetchDeletedReservations(); // Refresh the deleted reservations list
          // Also refresh the active reservations list
          if (!isCreating) {
            fetchReservations();
          }
          return null;
        });
        setModalOpen(true);
      }
    } catch (error: any) {
      setModalTitle("Error");
      setModalMessage(
        `Error: ${
          error.response?.data?.message || "Failed to restore reservation"
        }`
      );
      setModalType('error');
      setModalOpen(true);
    }
  };

  // Function to generate and download reservation slip as PDF
  const downloadReservationSlipAsPDF = async (reservation: Reservation) => {
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
      
      // Add reservation slip title with modern styling
      pdf.setFontSize(22);
      pdf.setTextColor(40, 40, 40);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RESERVATION SLIP', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;
      
      // Add date and reservation info in a modern card-like format
      pdf.setFontSize(11);
      const today = new Date().toLocaleDateString();
      
      // Reservation information card
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
      pdf.text('Reservation No:', cardX + 5, cardY + 10);
      pdf.text('Date:', cardX + 5, cardY + 20);
      pdf.setFont('helvetica', 'normal');
      pdf.text(reservation.reservationNo || 'N/A', cardX + 35, cardY + 10);
      pdf.text(today, cardX + 25, cardY + 20);
      
      // Guest information in a two-column layout
      const leftColX = margin;
      const rightColX = pageWidth / 2;
      
      // Adjust currentY to be below the card (cardY + cardHeight + some spacing)
      currentY = cardY + cardHeight + 10;
      
      // Guest Details Section
      pdf.setFontSize(14);
      pdf.setTextColor(40, 40, 40);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Guest Details', leftColX, currentY);
      currentY += 8;
      
      // Draw a line under the section title
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(leftColX, currentY, pageWidth - margin, currentY);
      currentY += 8;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(60, 60, 60);
      pdf.text('Guest Name:', leftColX, currentY);
      pdf.text('Mobile:', leftColX, currentY + 8);
      pdf.text('Email:', leftColX, currentY + 16);
      
      pdf.text('Arrival Date:', rightColX - 0, currentY);
      pdf.text('Departure Date:', rightColX - 0, currentY + 8);
      pdf.text('No. of Days:', rightColX - 0, currentY + 16);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(40, 40, 40);
      pdf.text(reservation.guestName || 'N/A', leftColX + 30, currentY);
      pdf.text(reservation.mobileNumber || 'N/A', leftColX + 30, currentY + 8);
      pdf.text(reservation.emailId || 'N/A', leftColX + 30, currentY + 16);
      
      pdf.text(reservation.arrivalDate || 'N/A', rightColX + 35, currentY);
      pdf.text(reservation.departureDate || 'N/A', rightColX + 35, currentY + 8);
      pdf.text(reservation.noOfDays?.toString() || 'N/A', rightColX + 35, currentY + 16);
      
      currentY += 24;
      
      // Room Details Section
      pdf.setFontSize(14);
      pdf.setTextColor(40, 40, 40);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Room Details', leftColX, currentY);
      currentY += 8;
      
      // Draw a line under the section title
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(leftColX, currentY, pageWidth - margin, currentY);
      currentY += 8;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(60, 60, 60);
      pdf.text('Room Type:', leftColX, currentY);
      pdf.text('Plan Type:', leftColX, currentY + 8);
      pdf.text('No. of Rooms:', leftColX, currentY + 16);
      pdf.text('No. of Persons:', leftColX, currentY + 24);
      
      pdf.text('Rate (per night):', rightColX - 10, currentY);
      pdf.text('GST Included:', rightColX - 10, currentY + 8);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(40, 40, 40);
      
      // Find room type name
      const roomType = roomTypes.find(rt => rt.typeId === reservation.roomTypeId);
      pdf.text(roomType?.typeName || reservation.roomTypeId || 'N/A', leftColX + 30, currentY);
      
      // Find plan type name
      const planType = planTypes.find(pt => pt.planId === reservation.planId);
      pdf.text(planType?.planName || reservation.planId || 'N/A', leftColX + 30, currentY + 8);
      
      pdf.text(reservation.noOfRooms?.toString() || 'N/A', leftColX + 30, currentY + 16);
      pdf.text(reservation.noOfPersons?.toString() || 'N/A', leftColX + 30, currentY + 24);
      
      pdf.text(`₹${reservation.rate?.toFixed(2) || '0.00'}`, rightColX + 35, currentY);
      pdf.text(reservation.includingGst === 'Y' ? 'Yes' : 'No', rightColX + 35, currentY + 8);
      
      currentY += 32;
      
      // Additional details if available
      if (reservation.companyId || reservation.nationalityId || reservation.remarks || reservation.idProof1 || reservation.idProof2 || reservation.idProof3) {
        // Additional Details Section
        pdf.setFontSize(14);
        pdf.setTextColor(40, 40, 40);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Additional Details', leftColX, currentY);
        currentY += 8;
        
        // Draw a line under the section title
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.line(leftColX, currentY, pageWidth - margin, currentY);
        currentY += 8;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(60, 60, 60);
        
        let detailY = currentY;
        let rightColY = currentY;
        
        // Left column details
        if (reservation.companyId) {
          const company = companies.find(c => c.companyId === reservation.companyId);
          pdf.text('Company:', leftColX, detailY);
          pdf.setFont('helvetica', 'normal');
          pdf.text(company?.companyName || reservation.companyId || 'N/A', leftColX + 25, detailY);
          detailY += 8;
          pdf.setFont('helvetica', 'bold');
        }
        
        if (reservation.nationalityId) {
          const nationality = nationalities.find(n => n.id === reservation.nationalityId);
          pdf.text('Nationality:', leftColX, detailY);
          pdf.setFont('helvetica', 'normal');
          pdf.text(nationality?.nationality || reservation.nationalityId || 'N/A', leftColX + 25, detailY);
          detailY += 8;
          pdf.setFont('helvetica', 'bold');
        }
        
        // Right column details
        if (reservation.idProof1) {
          pdf.text('ID Proof 1:', rightColX - 10, rightColY);
          pdf.setFont('helvetica', 'normal');
          pdf.text(reservation.idProof1, rightColX + 25, rightColY);
          rightColY += 8;
          pdf.setFont('helvetica', 'bold');
        }
        
        if (reservation.idProof2) {
          pdf.text('ID Proof 2:', rightColX - 10, rightColY);
          pdf.setFont('helvetica', 'normal');
          pdf.text(reservation.idProof2, rightColX + 25, rightColY);
          rightColY += 8;
          pdf.setFont('helvetica', 'bold');
        }
        
        if (reservation.idProof3) {
          pdf.text('ID Proof 3:', rightColX - 10, rightColY);
          pdf.setFont('helvetica', 'normal');
          pdf.text(reservation.idProof3, rightColX + 25, rightColY);
          rightColY += 8;
          pdf.setFont('helvetica', 'bold');
        }
        
        // Remarks (full width)
        if (reservation.remarks) {
          const remarksY = Math.max(detailY, rightColY) + 5;
          pdf.text('Remarks:', leftColX, remarksY);
          pdf.setFont('helvetica', 'normal');
          // Split long remarks into multiple lines
          const splitRemarks = pdf.splitTextToSize(reservation.remarks, pageWidth - 2 * margin - 30);
          pdf.text(splitRemarks, leftColX + 30, remarksY);
        }
        
        currentY = Math.max(detailY, rightColY) + 20;
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
      pdf.text('Thank You for Your Reservation!', pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 100, 100);
      pdf.text('This is a computer generated reservation slip and does not require a signature', pageWidth / 2, currentY, { align: 'center' });
      
      // Add reservation generation note
      currentY += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Reservation Generated: ${reservation.reservationNo || 'N/A'}`, pageWidth / 2, currentY, { align: 'center' });
      
      // Save the PDF
      const fileName = `Reservation_Slip_${reservation.reservationNo || 'unknown'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating reservation slip PDF:', error);
      setModalTitle('Error');
      setModalMessage('Failed to generate reservation slip. Please try again.');
      setModalType('error');
      setModalOpen(true);
    }
  };

  const handleClear = () => {
    setFormData({
      guestName: "",
      companyId: "",
      planId: "",
      roomTypeId: "",
      arrivalDate: "",
      departureDate: "",
      noOfDays: 1,
      noOfPersons: 1,
      noOfRooms: 1,
      mobileNumber: "",
      emailId: "",
      rate: 0, // Changed from empty string to 0
      includingGst: "N",
      remarks: "",
      idProof1: "",
      idProof2: "",
      idProof3: "",
      // Additional details
      settlementTypeId: "",
      arrivalModeId: "",
      arrivalDetails: "",
      nationalityId: "",
      refModeId: "",
      reservationSourceId: "",
    });
    setEditingReservation(null);
    setActiveTab("reservation");
  };

  // Render a dropdown with consistent loading and error handling
  const renderDropdown = (
    name: string,
    label: string,
    options: any[],
    valueKey: string,
    labelKey: string,
    required: boolean = false
  ) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label} {required && "*"}
      </label>
      <select
        name={name}
        value={formData[name as keyof typeof formData] || ""}
        onChange={handleInputChange}
        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
        disabled={masterDataLoading}
      >
        <option value="">{masterDataLoading ? "Loading..." : `Select ${label}`}</option>
        {options.length > 0 && !masterDataLoading ? (
          options.map((option) => (
            <option key={option[valueKey]} value={option[valueKey]}>
              {option[labelKey]}
            </option>
          ))
        ) : !masterDataLoading ? (
          <option value="" disabled>
            No options available
          </option>
        ) : null}
      </select>
    </div>
  );

  // Pagination component
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    // Generate page numbers
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center mb-4 sm:mb-0">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
            <span className="font-medium">{Math.min(indexOfLastItem, totalReservations)}</span> of{' '}
            <span className="font-medium">{totalReservations}</span> results
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {pageNumbers.map(number => (
            <button
              key={number}
              onClick={() => setCurrentPage(number)}
              className={`px-3 py-1 text-xs rounded ${
                currentPage === number
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {number}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // State for company hover tooltip
  const [hoveredCompany, setHoveredCompany] = useState<{ company: Company; x: number; y: number } | null>(null);
  // State for nationality hover tooltip
  const [hoveredNationality, setHoveredNationality] = useState<{ nationality: Nationality; x: number; y: number } | null>(null);

  // Function to find company by ID
  const getCompanyById = (companyId: string | undefined) => {
    if (!companyId) return null;
    return companies.find(company => company.companyId === companyId) || null;
  };

  // Function to find nationality by ID
  const getNationalityById = (nationalityId: string | undefined) => {
    if (!nationalityId) return null;
    return nationalities.find(nationality => nationality.id === nationalityId) || null;
  };

  // Render company name with hover functionality
  const renderCompanyName = (companyId: string | undefined) => {
    const companyName = companyId 
      ? (reservations.find(r => r.companyId === companyId)?.companyName || companyId)
      : "-";

    const company = getCompanyById(companyId);

    return (
      <div
        className="relative inline-block"
        onMouseEnter={(e) => {
          if (company) {
            setHoveredCompany({
              company,
              x: e.clientX,
              y: e.clientY
            });
          }
        }}
        onMouseLeave={() => setHoveredCompany(null)}
        onMouseMove={(e) => {
          if (hoveredCompany) {
            setHoveredCompany({
              ...hoveredCompany,
              x: e.clientX,
              y: e.clientY
            });
          }
        }}
      >
        {companyName}
        {hoveredCompany && hoveredCompany.company.companyId === companyId && (
          <div
            className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-64"
            style={{
              left: hoveredCompany.x + 10,
              top: hoveredCompany.y + 10,
            }}
          >
            <div className="font-semibold text-gray-900">{hoveredCompany.company.companyName}</div>
            <div className="text-sm text-gray-600 mt-1">
              {hoveredCompany.company.address1 && <div>{hoveredCompany.company.address1}</div>}
              {hoveredCompany.company.address2 && <div>{hoveredCompany.company.address2}</div>}
              {hoveredCompany.company.address3 && <div>{hoveredCompany.company.address3}</div>}
              {hoveredCompany.company.gstNumber && (
                <div className="mt-2">
                  <span className="font-medium">GST:</span> {hoveredCompany.company.gstNumber}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Custom Date Input Component with Calendar Icon
  const DateInput = ({ name, value, onChange, onKeyDown, label, required }: { 
    name: string; 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onKeyDown?: (e: React.KeyboardEvent) => void; 
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
          onKeyDown={onKeyDown}
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
          <h1 className="text-2xl font-bold text-gray-900">
            Reservation Management
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsCreating(true)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isCreating
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Create Reservation
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setActiveTab("reservation");
              }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                !isCreating && activeTab === "reservation"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Manage Reservations
            </button>
          </div>
        </div>

        {isCreating ? (
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                {editingReservation ? "Edit Reservation" : "Create Reservation"}
              </h2>
              <p className="text-gray-600 text-xs mt-1 ml-7">
                {editingReservation 
                  ? "Edit the details below to update the reservation." 
                  : "Fill in the details below to create a new reservation."}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => setActiveTab("reservation")}
                className={`px-4 py-3 text-xs font-medium flex-1 text-center transition-colors ${
                  activeTab === "reservation"
                    ? "border-b-2 border-blue-600 text-blue-600 bg-white"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"></path>
                  </svg>
                  Reservation Details
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("additional")}
                className={`px-4 py-3 text-xs font-medium flex-1 text-center transition-colors ${
                  activeTab === "additional"
                    ? "border-b-2 border-blue-600 text-blue-600 bg-white"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                  Additional Details
                </div>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4">
              {activeTab === "reservation" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Guest Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Guest Name *
                    </label>
                    <input
                      type="text"
                      name="guestName"
                      required
                      value={formData.guestName}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, "arrivalDate")}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                      placeholder="Enter guest's full name"
                    />
                  </div>

                  {/* Arrival Date */}
                  <DateInput 
                    name="arrivalDate"
                    value={formData.arrivalDate}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, "departureDate")}
                    label="Arrival Date *"
                    required
                  />

                  {/* Departure Date */}
                  <DateInput 
                    name="departureDate"
                    value={formData.departureDate}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, "noOfPersons")}
                    label="Departure Date *"
                    required
                  />

                  {/* Number of Days - Auto Calculated */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Number of Days
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

                  {/* Number of Persons */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Persons *
                    </label>
                    <input
                      type="number"
                      name="noOfPersons"
                      required
                      min="1"
                      value={formData.noOfPersons}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, "noOfRooms")}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                  </div>

                  {/* Number of Rooms */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Rooms *
                    </label>
                    <input
                      type="number"
                      name="noOfRooms"
                      required
                      min="1"
                      value={formData.noOfRooms}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, "mobileNumber")}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Mobile *
                    </label>
                    <input
                      type="tel"
                      name="mobileNumber"
                      required
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, "emailId")}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                      placeholder="+1234567890"
                    />
                  </div>

                  {/* Email ID */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="emailId"
                      value={formData.emailId}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, "rate")}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                      placeholder="guest@example.com"
                    />
                  </div>

                  {/* Rate per night */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Rate (₹/night)
                    </label>
                    <input
                      type="number"
                      name="rate"
                      value={formData.rate}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, "includingGst")}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                      placeholder="150.00"
                    />
                  </div>

                  {/* GST */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      GST Included
                    </label>
                    <select
                      name="includingGst"
                      value={formData.includingGst}
                      onChange={handleInputChange}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    >
                      <option value="N">No</option>
                      <option value="Y">Yes</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === "additional" && (
                <div className="space-y-3">
                  {/* Error message and retry button */}
                  {masterDataError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-3 rounded">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-4 w-4 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-xs text-red-700">
                            {masterDataError}
                          </p>
                          {debugInfo && (
                            <details className="mt-1 text-xs text-red-600">
                              <summary className="cursor-pointer">Debug Information</summary>
                              <pre className="mt-1 p-1 bg-red-100 rounded text-xs overflow-auto">
                                {JSON.stringify(debugInfo, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        <div className="ml-auto pl-3">
                          <div className="-mx-1.5 -my-1.5">
                            <button
                              onClick={fetchMasterData}
                              className="inline-flex bg-red-100 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              Retry
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading indicator */}
                  {masterDataLoading && (
                    <div className="flex justify-center items-center py-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600 text-xs">Loading master data...</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Company Dropdown */}
                    {renderDropdown("companyId", "Company", companies, "companyId", "companyName")}

                    {/* Settlement Type */}
                    {renderDropdown("settlementTypeId", "Settlement Type", settlementTypes, "id", "name")}

                    {/* Arrival Mode */}
                    {renderDropdown("arrivalModeId", "Arrival Mode", arrivalModes, "id", "arrivalMode")}

                    {/* Arrival Details */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Arrival Details
                      </label>
                      <input
                        type="text"
                        name="arrivalDetails"
                        value={formData.arrivalDetails}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                        placeholder="Flight/train details"
                      />
                    </div>

                    {/* Nationality */}
                    {renderDropdown("nationalityId", "Nationality", nationalities, "id", "nationality")}

                    {/* Ref Mode */}
                    {renderDropdown("refModeId", "Ref Mode", refModes, "id", "refMode")}

                    {/* Reservation Source */}
                    {renderDropdown("reservationSourceId", "Reservation Source", reservationSources, "id", "resvSource")}

                    {/* Plan Type */}
                    {renderDropdown("planId", "Plan Type", planTypes, "planId", "planName")}

                    {/* Room Type */}
                    {renderDropdown("roomTypeId", "Room Type", roomTypes, "typeId", "typeName")}

                    {/* Remarks */}
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Remarks
                      </label>
                      <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                        placeholder="Special requests or notes"
                      />
                    </div>

                    {/* ID Proof 1 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        ID Proof 1
                      </label>
                      <input
                        type="text"
                        name="idProof1"
                        value={formData.idProof1}
                        onChange={handleInputChange}
                        onKeyDown={(e) => handleKeyDown(e, "idProof2")}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                        placeholder="Passport: P12345678"
                      />
                    </div>

                    {/* ID Proof 2 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        ID Proof 2
                      </label>
                      <input
                        type="text"
                        name="idProof2"
                        value={formData.idProof2}
                        onChange={handleInputChange}
                        onKeyDown={(e) => handleKeyDown(e, "idProof3")}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                        placeholder="License: DL987654321"
                      />
                    </div>

                    {/* ID Proof 3 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        ID Proof 3
                      </label>
                      <input
                        type="text"
                        name="idProof3"
                        value={formData.idProof3}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                        placeholder="Aadhar: 1234-5678-9012"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons - Fixed at the bottom */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  {editingReservation ? "Cancel" : "Clear"}
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
                      {editingReservation ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      {editingReservation ? "Update Reservation" : "Save Reservation"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Manage Reservations
              </h2>
              
              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("reservation")}
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === "reservation"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Active Reservations
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("deleted")}
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === "deleted"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Deleted Reservations
                </button>
              </div>

              {/* Filter options */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Filter:</label>
                  <select
                    value={filterOption}
                    onChange={(e) => {
                      setFilterOption(e.target.value as "all" | "today" | "week" | "month");
                      setCurrentPage(1); // Reset to first page when filter changes
                    }}
                    className="rounded-md border border-gray-300 bg-white py-1 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
                
                {/* Search input */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Search:</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1); // Reset to first page when search term changes
                    }}
                    placeholder="Reservation No. or Guest Name"
                    className="rounded-md border border-gray-300 bg-white py-1 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div className="text-sm text-gray-500">
                  Showing {activeTab === "deleted" ? Math.min(indexOfLastItem, totalReservations) - indexOfFirstItem : Math.min(indexOfLastItem, totalReservations) - indexOfFirstItem} of {totalReservations} reservations
                </div>
              </div>
            </div>
            
            {activeTab === "reservation" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        No
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reservation No
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Guest Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Arrival
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Departure
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P/R
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Rate (₹)
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Checked
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentReservations.map((reservation, index) => (
                      <tr key={reservation.reservationNo}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {indexOfFirstItem + index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {reservation.reservationNo}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {reservation.guestName ? (
                            <div
                              className="inline-block relative"
                              onMouseEnter={(e) => {
                                const nationality = getNationalityById(reservation.nationalityId);
                                if (nationality) {
                                  setHoveredNationality({
                                    nationality,
                                    x: e.clientX,
                                    y: e.clientY
                                  });
                                }
                              }}
                              onMouseLeave={() => setHoveredNationality(null)}
                            >
                              {reservation.guestName}
                              {hoveredNationality && hoveredNationality.nationality.id === reservation.nationalityId && (
                                <div
                                  className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-64"
                                  style={{
                                    left: hoveredNationality.x + 10,
                                    top: hoveredNationality.y + 10,
                                  }}
                                >
                                  <div className="font-semibold text-gray-900 mb-2">Guest Details</div>
                                  <div className="text-sm text-gray-600">
                                    <div className="mb-1"><span className="font-medium">Name:</span> {reservation.guestName}</div>
                                    <div><span className="font-medium">Nationality:</span> {hoveredNationality.nationality.nationality}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {reservation.companyId ? (
                            <div
                              className="inline-block relative"
                              onMouseEnter={(e) => {
                                const company = getCompanyById(reservation.companyId);
                                if (company) {
                                  setHoveredCompany({
                                    company,
                                    x: e.clientX,
                                    y: e.clientY
                                  });
                                }
                              }}
                              onMouseLeave={() => setHoveredCompany(null)}
                            >
                              {reservation.companyName || reservation.companyId}
                              {hoveredCompany && hoveredCompany.company.companyId === reservation.companyId && (
                                <div
                                  className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-64"
                                  style={{
                                    left: hoveredCompany.x + 10,
                                    top: hoveredCompany.y + 10,
                                  }}
                                >
                                  <div className="font-semibold text-gray-900">{hoveredCompany.company.companyName}</div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {hoveredCompany.company.address1 && <div>{hoveredCompany.company.address1}</div>}
                                    {hoveredCompany.company.address2 && <div>{hoveredCompany.company.address2}</div>}
                                    {hoveredCompany.company.address3 && <div>{hoveredCompany.company.address3}</div>}
                                    {hoveredCompany.company.gstNumber && (
                                      <div className="mt-2">
                                        <span className="font-medium">GST:</span> {hoveredCompany.company.gstNumber}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {reservation.planName || reservation.planId || "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {reservation.arrivalDate ? formatDateToDDMMYYYY(reservation.arrivalDate) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                          {reservation.departureDate ? formatDateToDDMMYYYY(reservation.departureDate) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {reservation.noOfPersons}/{reservation.noOfRooms}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                          {reservation.rate.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {reservation.roomsCheckedIn || 0}/{reservation.noOfRooms}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(reservation)}
                            className="text-indigo-600 hover:text-indigo-900 mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(reservation.reservationNo)}
                            className="text-red-600 hover:text-red-900 mr-2"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => downloadReservationSlipAsPDF(reservation)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                {currentDeletedReservations.length === 0 ? (
                  <div className="p-6">
                    <p className="text-gray-500 text-center py-8">
                      {filterOption === "all" 
                        ? "No deleted reservations found." 
                        : `No deleted reservations found for ${filterOption === "today" ? "today" : filterOption === "week" ? "this week" : "this month"}.`}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              No
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reservation No
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Guest Name
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Company
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Plan
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Arrival
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                              Departure
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              P/R
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                              Rate (₹)
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Deleted At
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentDeletedReservations.map((reservation: Reservation, index: number) => (
                            <tr key={reservation.reservationNo}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {indexOfFirstItem + index + 1}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {reservation.reservationNo}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {reservation.guestName ? (
                                  <div
                                    className="inline-block relative"
                                    onMouseEnter={(e) => {
                                      const nationality = getNationalityById(reservation.nationalityId);
                                      if (nationality) {
                                        setHoveredNationality({
                                          nationality,
                                          x: e.clientX,
                                          y: e.clientY
                                        });
                                      }
                                    }}
                                    onMouseLeave={() => setHoveredNationality(null)}
                                  >
                                    {reservation.guestName}
                                    {hoveredNationality && hoveredNationality.nationality.id === reservation.nationalityId && (
                                      <div
                                        className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-64"
                                        style={{
                                          left: hoveredNationality.x + 10,
                                          top: hoveredNationality.y + 10,
                                        }}
                                      >
                                        <div className="font-semibold text-gray-900 mb-2">Guest Details</div>
                                        <div className="text-sm text-gray-600">
                                          <div className="mb-1"><span className="font-medium">Name:</span> {reservation.guestName}</div>
                                          <div><span className="font-medium">Nationality:</span> {hoveredNationality.nationality.nationality}</div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {reservation.companyId ? (
                                  <div
                                    className="inline-block relative"
                                    onMouseEnter={(e) => {
                                      const company = getCompanyById(reservation.companyId);
                                      if (company) {
                                        setHoveredCompany({
                                          company,
                                          x: e.clientX,
                                          y: e.clientY
                                        });
                                      }
                                    }}
                                    onMouseLeave={() => setHoveredCompany(null)}
                                  >
                                    {reservation.companyName || reservation.companyId}
                                    {hoveredCompany && hoveredCompany.company.companyId === reservation.companyId && (
                                      <div
                                        className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-64"
                                        style={{
                                          left: hoveredCompany.x + 10,
                                          top: hoveredCompany.y + 10,
                                        }}
                                      >
                                        <div className="font-semibold text-gray-900">{hoveredCompany.company.companyName}</div>
                                        <div className="text-sm text-gray-600 mt-1">
                                          {hoveredCompany.company.address1 && <div>{hoveredCompany.company.address1}</div>}
                                          {hoveredCompany.company.address2 && <div>{hoveredCompany.company.address2}</div>}
                                          {hoveredCompany.company.address3 && <div>{hoveredCompany.company.address3}</div>}
                                          {hoveredCompany.company.gstNumber && (
                                            <div className="mt-2">
                                              <span className="font-medium">GST:</span> {hoveredCompany.company.gstNumber}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {reservation.planName || reservation.planId || "-"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {reservation.arrivalDate ? formatDateToDDMMYYYY(reservation.arrivalDate) : '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                                {reservation.departureDate ? formatDateToDDMMYYYY(reservation.departureDate) : '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {reservation.noOfPersons}/{reservation.noOfRooms}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                                {reservation.rate.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {(reservation as any).deletedAt ? new Date((reservation as any).deletedAt).toLocaleString() : "-"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleRestore(reservation.reservationNo)}
                                  className="text-green-600 hover:text-green-900 mr-2"
                                >
                                  Restore
                                </button>
                                <button
                                  onClick={() => downloadReservationSlipAsPDF(reservation)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Print
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
            {renderPagination()}
          </div>
        )}
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
        {modalMessage}
      </Modal>
    </Layout>
  );
};

export default Reservations;