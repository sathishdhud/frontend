import axios from 'axios';
import { ApiResponse, ReservationSource } from '../types/api';

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

export const reservationSourceApi = {
  // Create a new reservation source
  createReservationSource: (data: { resvSource: string }) => 
    apiClient.post<ApiResponse<ReservationSource>>('/reservation-sources', data),

  // Get all reservation sources
  getAllReservationSources: () => 
    apiClient.get<ApiResponse<ReservationSource[]>>('/reservation-sources'),

  // Get a reservation source by ID
  getReservationSourceById: (id: string) => 
    apiClient.get<ApiResponse<ReservationSource>>(`/reservation-sources/${id}`),

  // Update a reservation source
  updateReservationSource: (id: string, data: { resvSource: string }) => 
    apiClient.put<ApiResponse<ReservationSource>>(`/reservation-sources/${id}`, data),

  // Delete a reservation source
  deleteReservationSource: (id: string) => 
    apiClient.delete<ApiResponse<void>>(`/reservation-sources/${id}`),
};