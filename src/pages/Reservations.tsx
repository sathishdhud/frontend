import React, { useState, useEffect } from "react";
import { Reservation, RoomType, Company, PlanType, SettlementType, ArrivalMode, Nationality, RefMode, ReservationSource } from "../types/api";
import { reservationApi, masterDataApi } from "../services/api";
import Layout from "../components/Layout/Layout";

const Reservations: React.FC = () => {
  const [isCreating, setIsCreating] = useState(true);
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [planTypes, setPlanTypes] = useState<PlanType[]>([]);
  const [settlementTypes, setSettlementTypes] = useState<SettlementType[]>([]);
  const [arrivalModes, setArrivalModes] = useState<ArrivalMode[]>([]);
  const [nationalities, setNationalities] = useState<Nationality[]>([]);
  const [refModes, setRefModes] = useState<RefMode[]>([]);
  const [reservationSources, setReservationSources] = useState<ReservationSource[]>([]);
  const [activeTab, setActiveTab] = useState<"reservation" | "additional">("reservation");
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [masterDataLoading, setMasterDataLoading] = useState(false);
  const [masterDataError, setMasterDataError] = useState<string | null>(null);
  const [masterDataFetched, setMasterDataFetched] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // New states for filtering and pagination
  const [filterOption, setFilterOption] = useState<"all" | "today" | "week" | "month">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8); // Changed to 8 records per page
  const [totalReservations, setTotalReservations] = useState(0);

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
    rate: 0,
    includingGst: "N" as "Y" | "N",
    remarks: "",
    // Additional details
    settlementTypeId: "",
    arrivalModeId: "",
    arrivalDetails: "",
    nationalityId: "",
    refModeId: "",
    reservationSourceId: "",
  });

  useEffect(() => {
    if (!isCreating) {
      fetchReservations();
    }
  }, [isCreating, filterOption, currentPage]);

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
      const diffTime = Math.abs(departure.getTime() - arrival.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setFormData((prev) => ({ ...prev, noOfDays: diffDays }));
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
        // Filter reservations based on selected option
        let filteredReservations = response.data.data;
        
        if (filterOption === "today") {
          const today = new Date().toISOString().split('T')[0];
          filteredReservations = response.data.data.filter(reservation => 
            reservation.arrivalDate === today
          );
        } else if (filterOption === "week") {
          const today = new Date();
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          filteredReservations = response.data.data.filter(reservation => {
            const arrivalDate = new Date(reservation.arrivalDate);
            return arrivalDate >= weekStart && arrivalDate <= weekEnd;
          });
        } else if (filterOption === "month") {
          const today = new Date();
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          
          filteredReservations = response.data.data.filter(reservation => {
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

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReservations = reservations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(reservations.length / itemsPerPage);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare the data for submission
      const submissionData: any = {
        ...formData,
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
        alert(editingReservation ? "Reservation updated successfully!" : "Reservation created successfully!");
        handleClear();
        if (!isCreating) {
          fetchReservations(); // Refresh the reservations list
        }
      }
    } catch (error: any) {
      alert(
        `Error: ${
          error.response?.data?.message || (editingReservation ? "Failed to update reservation" : "Failed to create reservation")
        }`
      );
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
      rate: reservation.rate || 0,
      includingGst: (reservation.includingGst as "Y" | "N") || "N",
      remarks: reservation.remarks || "",
      // Additional details
      settlementTypeId: reservation.settlementTypeId || "",
      arrivalModeId: reservation.arrivalModeId || "",
      arrivalDetails: reservation.arrivalDetails || "",
      nationalityId: reservation.nationalityId || "",
      refModeId: reservation.refModeId || "",
      reservationSourceId: reservation.reservationSourceId || "",
    });
    setIsCreating(true);
    setActiveTab("reservation");
  };

  const handleDelete = async (reservationId: string) => {
    if (!window.confirm("Are you sure you want to delete this reservation?")) {
      return;
    }

    try {
      const response = await reservationApi.deleteReservation(reservationId);
      if (response.data.success) {
        alert("Reservation deleted successfully!");
        fetchReservations(); // Refresh the reservations list
      }
    } catch (error: any) {
      alert(
        `Error: ${
          error.response?.data?.message || "Failed to delete reservation"
        }`
      );
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
      rate: 0,
      includingGst: "N",
      remarks: "",
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
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && "*"}
      </label>
      <select
        name={name}
        value={formData[name as keyof typeof formData] || ""}
        onChange={handleInputChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className={`px-3 py-1 text-sm rounded ${
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Reservation Management
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsCreating(true)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isCreating
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Create Reservation
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !isCreating
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Manage Reservations
            </button>
          </div>
        </div>

        {isCreating ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingReservation ? "Edit Reservation" : "Create Reservation"}
              </h2>
              <p className="text-gray-600 mt-1">
                {editingReservation 
                  ? "Edit the details below to update the reservation." 
                  : "Fill in the details below to create a new reservation."}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab("reservation")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "reservation"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Reservation Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("additional")}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "additional"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Additional Details
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              {activeTab === "reservation" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Guest Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Guest Name *
                    </label>
                    <input
                      type="text"
                      name="guestName"
                      required
                      value={formData.guestName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter guest's full name"
                    />
                  </div>

                  {/* Arrival Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Arrival Date *
                    </label>
                    <input
                      type="date"
                      name="arrivalDate"
                      required
                      value={formData.arrivalDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Departure Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Departure Date *
                    </label>
                    <input
                      type="date"
                      name="departureDate"
                      required
                      value={formData.departureDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Number of Days - Auto Calculated */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Days
                    </label>
                    <input
                      type="number"
                      name="noOfDays"
                      min="1"
                      value={formData.noOfDays}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated based on arrival and departure dates</p>
                  </div>

                  {/* Number of Persons */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Persons *
                    </label>
                    <input
                      type="number"
                      name="noOfPersons"
                      required
                      min="1"
                      value={formData.noOfPersons}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Number of Rooms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Rooms *
                    </label>
                    <input
                      type="number"
                      name="noOfRooms"
                      required
                      min="1"
                      value={formData.noOfRooms}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      name="mobileNumber"
                      required
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., +1234567890"
                    />
                  </div>

                  {/* Email ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email ID
                    </label>
                    <input
                      type="email"
                      name="emailId"
                      value={formData.emailId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., guest@example.com"
                    />
                  </div>

                  {/* Rate per night */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rate (per night)
                    </label>
                    <input
                      type="number"
                      name="rate"
                      min="0"
                      step="0.01"
                      value={formData.rate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 150.00"
                    />
                  </div>

                  {/* GST */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Included
                    </label>
                    <select
                      name="includingGst"
                      value={formData.includingGst}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="N">No</option>
                      <option value="Y">Yes</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === "additional" && (
                <div className="space-y-6">
                  {/* Error message and retry button */}
                  {masterDataError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">
                            {masterDataError}
                          </p>
                          {debugInfo && (
                            <details className="mt-2 text-sm text-red-600">
                              <summary className="cursor-pointer">Debug Information</summary>
                              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                                {JSON.stringify(debugInfo, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        <div className="ml-auto pl-3">
                          <div className="-mx-1.5 -my-1.5">
                            <button
                              onClick={fetchMasterData}
                              className="inline-flex bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
                    <div className="flex justify-center items-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading master data...</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Company Dropdown */}
                    {renderDropdown("companyId", "Company", companies, "companyId", "companyName")}

                    {/* Settlement Type */}
                    {renderDropdown("settlementTypeId", "Settlement Type", settlementTypes, "id", "name")}

                    {/* Arrival Mode */}
                    {renderDropdown("arrivalModeId", "Arrival Mode", arrivalModes, "id", "arrivalMode")}

                    {/* Arrival Details */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Arrival Details
                      </label>
                      <input
                        type="text"
                        name="arrivalDetails"
                        value={formData.arrivalDetails}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Flight number, train details, etc."
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remarks
                      </label>
                      <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Any special requests or notes (Optional)"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {editingReservation ? "Cancel" : "Clear"}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                >
                  {loading ? (editingReservation ? "Updating..." : "Saving...") : (editingReservation ? "Update Reservation" : "Save Reservation")}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Manage Reservations
              </h2>
              
              {/* Filter options */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
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
                
                <div className="text-sm text-gray-500">
                  Showing {Math.min(indexOfLastItem, totalReservations) - indexOfFirstItem} of {totalReservations} reservations
                </div>
              </div>
            </div>
            
            {currentReservations.length === 0 ? (
              <div className="p-6">
                <p className="text-gray-500 text-center py-8">
                  {filterOption === "all" 
                    ? "No reservations found." 
                    : `No reservations found for ${filterOption === "today" ? "today" : filterOption === "week" ? "this week" : "this month"}.`}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          No
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reservation No
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Guest Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Plan
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Arrival
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Departure
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          P/R
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Rate (₹)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Checked
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentReservations.map((reservation, index) => (
                        <tr key={reservation.reservationNo}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {indexOfFirstItem + index + 1}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {reservation.reservationNo}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
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
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
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
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {reservation.planName || reservation.planId || "-"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {reservation.arrivalDate}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                            {reservation.departureDate}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {reservation.noOfPersons}/{reservation.noOfRooms}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                            {reservation.rate.toFixed(2)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {reservation.roomsCheckedIn || 0}/{reservation.noOfRooms}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEdit(reservation)}
                              className="text-indigo-600 hover:text-indigo-900 mr-2"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(reservation.reservationNo)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination()}
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reservations;