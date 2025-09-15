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

export interface Room {
  roomId: string;
  roomNo: string;
  floor: string;
  status: 'VR' | 'OD' | 'OI' | 'Blocked';
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
}

export interface PaymentMode {
  id: string;
  name: string;
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