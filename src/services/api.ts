// Transaction APIs

import axios, { AxiosResponse } from 'axios';
import { ApiResponse, User, UserType, Room, RoomStats, Reservation, CheckIn, Advance, PaymentMode, RoomType, Company, PlanType, Tax, AccountHead, Nationality, RefMode, ArrivalMode, ReservationSource, Transaction, HousekeepingTask, HousekeepingStats, SettlementType, BillUpdateRequest } from '../types/api';

const API_BASE_URL = 'http://localhost:8080/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authApi = {
  login: (userName: string, password: string): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.post('/users/login', { userName, password }),
  
  logout: (): Promise<AxiosResponse<ApiResponse>> =>
    apiClient.post('/users/logout'),
};

// Room APIs
export const roomApi = {
  getRooms: (): Promise<AxiosResponse<ApiResponse<Room[]>>> =>
    apiClient.get('/rooms'),
  
  getRoomStats: (): Promise<AxiosResponse<ApiResponse<RoomStats>>> =>
    apiClient.get('/rooms/occupancy-stats'),
  
  getAvailableRooms: (): Promise<AxiosResponse<ApiResponse<Room[]>>> =>
    apiClient.get('/rooms/available'),
  
  updateRoomStatus: (roomId: string, status: string): Promise<AxiosResponse<ApiResponse<Room>>> =>
    apiClient.put(`/rooms/${roomId}/status/${status}`),

  // Fetch details for a single room
  getRoomById: (roomId: string): Promise<AxiosResponse<ApiResponse<Room>>> =>
    apiClient.get(`/rooms/${roomId}`),
  
  // Get room availability for a date range
  getRoomAvailability: (startDate: string, endDate: string): Promise<AxiosResponse<ApiResponse<Room[]>>> =>
    apiClient.get(`/rooms/availability?startDate=${startDate}&endDate=${endDate}`),
};

export const transactionApi = {
  createInhouseTransaction: (data: {
    folioNo: string;
    guestName: string;
    accHeadId: string;
    amount: number;
    narration?: string;
    voucherNo?: string;
    
  }): Promise<AxiosResponse<ApiResponse<Transaction>>> =>
    apiClient.post('/transactions/inhouse', data),
  getTransactionsByFolio: (folioNo: string): Promise<AxiosResponse<ApiResponse<Transaction[]>>> =>
    apiClient.get(`/transactions/folio/${folioNo}`),
};

// Bill APIs
export const billApi = {
  generateBill: (folioNo: string, financialYear: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/bills/generate/${folioNo}`, { financialYear }),
  
  updateBill: (billNo: string, billData: BillUpdateRequest): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/bills/${billNo}`, billData),

  // Add payment to a bill
  addPaymentToBill: (billNo: string, paymentData: { 
    paymentAmount: number; 
    modeOfPaymentId: string; 
    paymentNotes?: string 
  }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/bills/${billNo}/payment`, paymentData),

  getRelatedBills: (billNo: string): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/bills/${billNo}/related`),
  
  // Void a bill
  voidBill: (billNo: string, reason: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post(`/bills/${billNo}/void`, { reason }),
  
  // Get bill by folio number
  getBillByFolio: (folioNo: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/bills/folio/${folioNo}`),
  
  // Get bill by bill number
  getBillByBillNo: (billNo: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.get(`/bills/${billNo}`),
};

// Reservation APIs
export const reservationApi = {
  createReservation: (reservation: Omit<Reservation, 'reservationNo'>): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.post('/reservations', reservation),
  
  getReservations: (): Promise<AxiosResponse<ApiResponse<Reservation[]>>> =>
    apiClient.get('/reservations'),
  
  searchReservations: (searchTerm: string): Promise<AxiosResponse<ApiResponse<Reservation[]>>> =>
    apiClient.get(`/reservations/search?searchTerm=${encodeURIComponent(searchTerm)}`),
  
  getPendingCheckIns: (): Promise<AxiosResponse<ApiResponse<Reservation[]>>> =>
    apiClient.get('/reservations/pending-checkins'),
  
  // Update reservation
  updateReservation: (reservationId: string, reservation: Partial<Reservation>): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.put(`/reservations/${reservationId}`, reservation),
  
  // Update rooms checked in count
  updateRoomsCheckedIn: (reservationNo: string, roomsCheckedIn: number): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.put(`/reservations/${reservationNo}/rooms-checked-in`, { roomsCheckedIn }),
  
  // Delete reservation
  deleteReservation: (reservationId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/reservations/${reservationId}`),
  
  // Update reservation status
  updateReservationStatus: (reservationNo: string, status: string): Promise<AxiosResponse<ApiResponse<Reservation>>> =>
    apiClient.put(`/reservations/${reservationNo}/status`, { status }),
};

// Check-in APIs
export const checkInApi = {
  processCheckIn: (checkIn: Omit<CheckIn, 'folioNo'>): Promise<AxiosResponse<ApiResponse<CheckIn>>> =>
    apiClient.post('/checkins', checkIn),
  
  getInHouseGuests: (): Promise<AxiosResponse<ApiResponse<CheckIn[]>>> =>
    apiClient.get('/checkins/inhouse'),
  
  searchCheckIns: (searchTerm: string): Promise<AxiosResponse<ApiResponse<CheckIn[]>>> =>
    apiClient.get(`/checkins/search?searchTerm=${encodeURIComponent(searchTerm)}`),
};

// Advance APIs
export const advanceApi = {
  createAdvanceForReservation: (advance: Omit<Advance, 'advanceId' | 'receiptNo'>): Promise<AxiosResponse<ApiResponse<Advance>>> =>
    apiClient.post('/advances/reservation', advance),
  
  createAdvanceForInHouse: (advance: Omit<Advance, 'advanceId' | 'receiptNo'>): Promise<AxiosResponse<ApiResponse<Advance>>> =>
    apiClient.post('/advances/inhouse', advance),
  
  getAdvancesByReservation: (reservationNo: string): Promise<AxiosResponse<ApiResponse<Advance[]>>> =>
    apiClient.get(`/advances/reservation/${reservationNo}`),
  
  getAdvancesByFolio: (folioNo: string): Promise<AxiosResponse<ApiResponse<Advance[]>>> =>
    apiClient.get(`/advances/folio/${folioNo}`),
  
  // New API endpoint to get advances by bill number
  getAdvancesByBill: (billNo: string): Promise<AxiosResponse<ApiResponse<Advance[]>>> =>
    apiClient.get(`/advances/bill/${billNo}`),
  
  // New API endpoint to get guest name by reservation number
  getGuestNameByReservation: (reservationNo: string): Promise<AxiosResponse<ApiResponse<string>>> =>
    apiClient.get(`/advances/reservation/${reservationNo}/guest-name`),
};

// Master Data APIs
export const masterDataApi = {
  getPaymentModes: (): Promise<AxiosResponse<ApiResponse<PaymentMode[]>>> =>
    apiClient.get('/payment-modes'),
  
  getRoomTypes: (): Promise<AxiosResponse<ApiResponse<RoomType[]>>> =>
    apiClient.get('/room-types'),
  
  getCompanies: (): Promise<AxiosResponse<ApiResponse<Company[]>>> =>
    apiClient.get('/companies'),
  
  getPlanTypes: (): Promise<AxiosResponse<ApiResponse<PlanType[]>>> =>
    apiClient.get('/plan-types'),
  
  getTaxes: (): Promise<AxiosResponse<ApiResponse<Tax[]>>> =>
    apiClient.get('/taxes'),
  
  getAccountHeads: (): Promise<AxiosResponse<ApiResponse<AccountHead[]>>> =>
    apiClient.get('/account-heads'),
  
  getNationalities: (): Promise<AxiosResponse<ApiResponse<Nationality[]>>> =>
    apiClient.get('/nationalities'),
  
  getRefModes: (): Promise<AxiosResponse<ApiResponse<RefMode[]>>> =>
    apiClient.get('/ref-modes'),
  
  getArrivalModes: (): Promise<AxiosResponse<ApiResponse<ArrivalMode[]>>> =>
    apiClient.get('/arrival-modes'),
  
  getReservationSources: (): Promise<AxiosResponse<ApiResponse<ReservationSource[]>>> =>
    apiClient.get('/reservation-sources'),
  
  getSettlementTypes: (): Promise<AxiosResponse<ApiResponse<SettlementType[]>>> =>
    apiClient.get('/settlement-types'),

  // Tax Master APIs
  createTax: (taxData: { taxName?: string; percentage?: number }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/taxes', taxData),
  
  updateTax: (taxId: string, taxData: { taxName?: string; percentage?: number }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/taxes/${taxId}`, taxData),
  
  deleteTax: (taxId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/taxes/${taxId}`),
  
  // Account Head APIs
  createAccountHead: (accountData: { accountName: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/account-heads', accountData),
  
  updateAccountHead: (accountHeadId: string, accountData: { accountName: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/account-heads/${accountHeadId}`, accountData),
  
  deleteAccountHead: (accountHeadId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/account-heads/${accountHeadId}`),
  
  // Room APIs
  createRoom: (roomData: { roomNo: string; floor: string; status: string; roomTypeId: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/rooms', roomData),
  
  updateRoom: (roomId: string, roomData: { roomNo: string; floor: string; status: string; roomTypeId: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/rooms/${roomId}`, roomData),
  
  deleteRoom: (roomId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/rooms/${roomId}`),
  
  // Room Type APIs
  createRoomType: (roomTypeData: { typeName: string; noOfRooms: number }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/room-types', roomTypeData),
  
  updateRoomType: (typeId: string, roomTypeData: { typeName: string; noOfRooms: number }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/room-types/${typeId}`, roomTypeData),
  
  deleteRoomType: (typeId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/room-types/${typeId}`),
  
  // Payment Mode APIs
  createPaymentMode: (paymentModeData: { id: string; name: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/payment-modes', paymentModeData),
  
  updatePaymentMode: (id: string, paymentModeData: { name: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/payment-modes/${id}`, paymentModeData),
  
  deletePaymentMode: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/payment-modes/${id}`),
  
  // Plan Type APIs
  createPlanType: (planTypeData: { planName: string; discountPercentage: number }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/plan-types', planTypeData),
  
  updatePlanType: (planId: string, planTypeData: { planName: string; discountPercentage: number }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/plan-types/${planId}`, planTypeData),
  
  deletePlanType: (planId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/plan-types/${planId}`),
  
  // Company APIs
  createCompany: (companyData: { companyName: string; address1?: string; address2?: string; address3?: string; gstNumber?: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/companies', companyData),
  
  updateCompany: (companyId: string, companyData: { companyName: string; address1?: string; address2?: string; address3?: string; gstNumber?: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/companies/${companyId}`, companyData),
  
  deleteCompany: (companyId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/companies/${companyId}`),
  
  // Nationality APIs
  createNationality: (nationalityData: { nationality: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/nationalities', nationalityData),
  
  updateNationality: (id: string, nationalityData: { nationality: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/nationalities/${id}`, nationalityData),
  
  deleteNationality: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/nationalities/${id}`),
  
  // Ref Mode APIs
  createRefMode: (refModeData: { refMode: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/ref-modes', refModeData),
  
  updateRefMode: (id: string, refModeData: { refMode: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/ref-modes/${id}`, refModeData),
  
  deleteRefMode: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/ref-modes/${id}`),
  
  // Arrival Mode APIs
  createArrivalMode: (arrivalModeData: { arrivalMode: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/arrival-modes', arrivalModeData),
  
  updateArrivalMode: (id: string, arrivalModeData: { arrivalMode: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/arrival-modes/${id}`, arrivalModeData),
  
  deleteArrivalMode: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/arrival-modes/${id}`),
  
  // Reservation Source APIs
  createReservationSource: (reservationSourceData: { resvSource: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/reservation-sources', reservationSourceData),
  
  updateReservationSource: (id: string, reservationSourceData: { resvSource: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/reservation-sources/${id}`, reservationSourceData),
  
  deleteReservationSource: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/reservation-sources/${id}`),
  
  // User Management APIs
  getUsers: (): Promise<AxiosResponse<ApiResponse<User[]>>> =>
    apiClient.get('/users'),
  
  createUser: (userData: { userName: string; userTypeId: string; password: string }): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.post('/users', userData),
  
  updateUser: (userId: string, userData: { userName: string; userTypeId: string; password?: string }): Promise<AxiosResponse<ApiResponse<User>>> =>
    apiClient.put(`/users/${userId}`, userData),
  
  deleteUser: (userId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/users/${userId}`),
  
  // User Type APIs
  getUserTypes: (): Promise<AxiosResponse<ApiResponse<UserType[]>>> =>
    apiClient.get('/user-types'),
  
  createUserType: (userTypeData: { typeName: string }): Promise<AxiosResponse<ApiResponse<UserType>>> =>
    apiClient.post('/user-types', userTypeData),
  
  updateUserType: (userTypeId: string, userTypeData: { typeName: string }): Promise<AxiosResponse<ApiResponse<UserType>>> =>
    apiClient.put(`/user-types/${userTypeId}`, userTypeData),
  
  deleteUserType: (userTypeId: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/user-types/${userTypeId}`),
  
  // Settlement Type APIs
  createSettlementType: (settlementTypeData: { id: string; name: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/settlement-types', settlementTypeData),
  
  updateSettlementType: (id: string, settlementTypeData: { id: string; name: string }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.put(`/settlement-types/${id}`, settlementTypeData),
  
  deleteSettlementType: (id: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/settlement-types/${id}`),

};

// Operations APIs
export const operationsApi = {
  // Audit date change
  auditDateChange: (confirmation: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/operations/audit-date-change', { confirmation }),
  
  // Shift change
  shiftChange: (data: { 
    shiftDate: string; 
    shiftNo: string; 
    balance: number 
  }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/operations/shift-change', data),
};

// Housekeeping APIs
export const housekeepingApi = {
  // Get all housekeeping tasks
  getTasks: (): Promise<AxiosResponse<ApiResponse<HousekeepingTask[]>>> =>
    apiClient.get('/housekeeping/tasks'),
  
  // Create a new housekeeping task
  createTask: (taskData: Omit<HousekeepingTask, 'taskId' | 'createdAt' | 'updatedAt'>): Promise<AxiosResponse<ApiResponse<HousekeepingTask>>> =>
    apiClient.post('/housekeeping/tasks', taskData),
  
  // Update an existing housekeeping task
  updateTask: (taskId: number, taskData: Partial<HousekeepingTask>): Promise<AxiosResponse<ApiResponse<HousekeepingTask>>> =>
    apiClient.put(`/housekeeping/tasks/${taskId}`, taskData),
  
  // Delete a housekeeping task
  deleteTask: (taskId: number): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.delete(`/housekeeping/tasks/${taskId}`),
  
  // Update room cleaning status
  updateRoomStatus: (roomId: string, status: string): Promise<AxiosResponse<ApiResponse<Room>>> =>
    apiClient.post('/housekeeping/room-status', null, { 
      params: { roomId, status },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }),
  
  // Get rooms by cleaning status
  getRoomsByStatus: (status: string): Promise<AxiosResponse<ApiResponse<Room[]>>> =>
    apiClient.get(`/housekeeping/rooms-by-status?status=${status}`),
  
  // Get housekeeping tasks by room
  getTasksByRoom: (roomId: string): Promise<AxiosResponse<ApiResponse<HousekeepingTask[]>>> =>
    apiClient.get(`/housekeeping/tasks/room/${roomId}`),
  
  // Get housekeeping tasks by status
  getTasksByStatus: (status: string): Promise<AxiosResponse<ApiResponse<HousekeepingTask[]>>> =>
    apiClient.get(`/housekeeping/tasks/status/${status}`),
  
  // Get housekeeping statistics
  getStatistics: (): Promise<AxiosResponse<ApiResponse<HousekeepingStats>>> =>
    apiClient.get('/housekeeping/statistics'),
};

// Report APIs
export const reportApi = {
  // Sale Report Bill Wise / Date Wise
  getSaleReport: (fromDate: string, toDate: string, reportType: 'bill' | 'date'): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/reports/sales?fromDate=${fromDate}&toDate=${toDate}&type=${reportType}`),
  
  // Folio Wise Sales
  getFolioWiseSales: (folioNo: string): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/reports/sales/folio/${folioNo}`),
  
  // Shift Report
  getShiftReport: (shiftDate: string, shiftNo: string): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/reports/shift?shiftDate=${shiftDate}&shiftNo=${shiftNo}`),
  
  // Receipt Report
  getReceiptReport: (fromDate: string, toDate: string): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/reports/receipts?fromDate=${fromDate}&toDate=${toDate}`),
  
  // Bill Acc Wise Summary Report
  getBillAccountWiseSummary: (fromDate: string, toDate: string): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/reports/bill-account-summary?fromDate=${fromDate}&toDate=${toDate}`),
  
  // Foreigner Guest Report
  getForeignerGuestReport: (fromDate: string, toDate: string): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/reports/foreign-guests?fromDate=${fromDate}&toDate=${toDate}`),
  
  // In house Guest List room wise/ Name wise/Mobile wise/company wise
  getInhouseGuestList: (sortBy: 'room' | 'name' | 'mobile' | 'company'): Promise<AxiosResponse<ApiResponse<CheckIn[]>>> =>
    apiClient.get(`/reports/inhouse-guests?sortBy=${sortBy}`),
  
  // Expected arrivals
  getExpectedArrivals: (fromDate: string, toDate: string): Promise<AxiosResponse<ApiResponse<Reservation[]>>> =>
    apiClient.get(`/reports/expected-arrivals?fromDate=${fromDate}&toDate=${toDate}`),
  
  // Expected Departures
  getExpectedDepartures: (fromDate: string, toDate: string): Promise<AxiosResponse<ApiResponse<CheckIn[]>>> =>
    apiClient.get(`/reports/expected-departures?fromDate=${fromDate}&toDate=${toDate}`),
  
  // Occupancy Report Date Wise Room Category Wise
  getOccupancyReport: (fromDate: string, toDate: string, roomTypeId?: string): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/reports/occupancy?fromDate=${fromDate}&toDate=${toDate}${roomTypeId ? `&roomTypeId=${roomTypeId}` : ''}`),
  
  // Managers Report
  getManagersReport: (fromDate: string, toDate: string): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/reports/managers?fromDate=${fromDate}&toDate=${toDate}`),
  
  // Segment wise MIS Reports
  getSegmentWiseMIS: (fromDate: string, toDate: string, segmentType: string): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/reports/mis-segment?fromDate=${fromDate}&toDate=${toDate}&segment=${segmentType}`),
};
