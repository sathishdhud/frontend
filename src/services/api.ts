// Transaction APIs

import axios, { AxiosResponse } from 'axios';
import { ApiResponse, User, Room, RoomStats, Reservation, CheckIn, Advance, PaymentMode, RoomType, Company, PlanType } from '../types/api';

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
};

export const transactionApi = {
  createInhouseTransaction: (data: {
    folioNo: string;
    guestName: string;
    accHeadId: string;
    amount: number;
    narration?: string;
    
  }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/transactions/inhouse', data),
  getTransactionsByFolio: (folioNo: string): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get(`/transactions/folio/${folioNo}`),
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
};