export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface User {
  userId: string;
  userName: string;
  userTypeId: string;
  userTypeRole: string;
  userTypeName: string;
  token?: string;
}

export interface UserType {
  userTypeId: string;
  typeName: string;
  role?: string;
}

export interface Room {
  roomId: string;
  roomNo: string;
  floor: string;
  status: 'VR' | 'OD' | 'OI' | 'VD';
  roomTypeId: string;
  roomTypeName?: string;
  guestName?: string;
  folioNo?: string;
}

export interface RoomStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  blockedRooms: number;
  occupancyPercentage: number;
}

export interface Reservation {
  reservationNo: string;
  guestName: string;
  companyId?: string;
  companyName?: string;
  planId?: string;
  planName?: string;
  roomTypeId?: string;
  roomTypeName?: string;
  arrivalDate: string;
  departureDate: string;
  noOfDays: number;
  noOfPersons: number;
  noOfRooms: number;
  mobileNumber: string;
  emailId?: string;
  rate: number;
  includingGst: 'Y' | 'N';
  remarks?: string;
  roomsCheckedIn?: number;
  createdAt?: string;
  updatedAt?: string;
  idProof1?: string;
  idProof2?: string;
  idProof3?: string;
  settlementTypeId?: string;
  settlementTypeName?: string;
  arrivalModeId?: string;
  arrivalModeName?: string;
  arrivalDetails?: string;
  nationalityId?: string;
  nationalityName?: string;
  refModeId?: string;
  refModeName?: string;
  reservationSourceId?: string;
  reservationSourceName?: string;
}

// Interface for deleted reservations
export interface DeletedReservation extends Reservation {
  deletedAt?: string;
}

export interface CheckIn {
  folioNo: string;
  reservationNo?: string;
  guestName: string;
  roomId: string;
  roomNo?: string;
  arrivalDate: string;
  departureDate: string;
  mobileNumber?: string;
  emailId?: string;
  rate: number;
  walkIn: 'Y' | 'N';
  remarks?: string;
  includingGst?: 'Y' | 'N';
  noOfPersons?: number;
  checkout?: boolean;
  // Enhanced fields as per API documentation
  idProof1?: string;
  idProof2?: string;
  idProof3?: string;
  companyId?: string;
  planId?: string;
  roomTypeId?: string;
  settlementTypeId?: string;
  arrivalModeId?: string;
  arrivalDetails?: string;
  nationalityId?: string;
  refModeId?: string;
  resvSourceId?: string;
  auditDate?: string;
  totalAdvances?: number;
}

export interface Advance {
  advanceId?: string;
  receiptNo?: string;
  reservationNo?: string;
  folioNo?: string;
  billNo?: string;
  guestName: string;
  date?: string;
  arrivalDate?: string;
  auditDate?: string;
  modeOfPaymentId: string;
  modeOfPaymentName?: string;
  amount: number;
  narration?: string;
  remarks?: string;
  creditCardCompany?: string;
  cardNumber?: string;
  onlineCompanyName?: string;
  details?: string;
}

export interface PaymentMode {
  id: string;
  name: string;
}

export interface BillPayment {
  paymentId: string;
  billNo: string;
  paymentAmount: number;
  modeOfPaymentId: string;
  modeOfPaymentName?: string;
  paymentNotes?: string;
  paymentDate: string;
}

// Add this interface for the bill update request
export interface BillUpdateRequest {
  guestName: string;
  totalAmount: number;
  advanceAmount: number;
  paymentNotes: string;
  advances?: Advance[];
}

export interface RoomType {
  typeId: string;
  typeName: string;
  noOfRooms: number;
}

export interface Company {
  companyId: string;
  companyName: string;
  address1?: string;
  address2?: string;
  address3?: string;
  gstNumber?: string;
}

export interface PlanType {
  planId: string;
  planName: string;
  discountPercentage: number;
}

export interface Tax {
  taxId: string;
  taxName: string;
  percentage: number;
}

export interface AccountHead {
  accHeadId: string;
  name: string;
  companyName?: string;
  chequeNumber?: string;
  date?: string;
}

export interface Nationality {
  id: string;
  nationality: string;
}

export interface RefMode {
  id: string;
  refMode: string;
}

export interface ArrivalMode {
  id: string;
  arrivalMode: string;
}

export interface ReservationSource {
  id: string;
  resvSource: string;
}

export interface SettlementType {
  id: string;
  name: string;
}

export interface Transaction {
  transactionId?: string;
  folioNo: string;
  billNo?: string;
  roomId?: string;
  roomNo?: string;
  guestName: string;
  date?: string;
  auditDate?: string;
  accHeadId: string;
  accHeadName?: string;
  voucherNo?: string;
  amount: number;
  narration?: string;
  createdAt?: string;
}

export interface HousekeepingTask {
  taskId?: number;
  roomId: string;
  roomNo?: string;
  floor?: string;
  status: string;
  roomTypeId?: string;
  roomTypeName?: string;
  guestName?: string;
  folioNo?: string;
  assignedTo?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HousekeepingStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  blockedRooms: number;
  outOfOrderRooms: number;
  occupancyPercentage: number;
}

// HMS System interface for shift management
export interface Hmsystem {
  id?: number;
  shiftDate: string;
  runningShift: number;
  totalShift: number;
  createdAt?: string;
  updatedAt?: string;
}

// Shift interface
export interface Shift {
  id?: number;
  no: string; // shift no
  date: string; // shift date
  audit_date?: string; // audit date
  opening_balance?: number;
  closing_balance?: number;
  total_income?: number;
  total_expense?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Shift close request interface
export interface ShiftCloseRequest {
  balance: number;
}

// Expense interface
export interface Expense {
  transactionId?: string;
  voucherNo: string;
  date: string;
  accountHeadId: string;
  accHeadName?: string;
  amount: number;
  narration?: string;
  shiftNo: string;
  shiftDate: string;
  createdAt?: string;
}

// Sales Receipt interface
export interface SalesReceipt {
  receiptNo: string;
  date: string;
  modeOfPaymentId: string;
  modeOfPaymentName?: string;
  amount: number;
  voucherNo: string;
  narration?: string;
  shiftNo: string;
  shiftDate: string;
  createdAt?: string;
}
