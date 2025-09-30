import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          window.location.href = '/auth/login';
        }

        const message = error.response?.data?.message || 'An error occurred';
        
        if (error.response?.status >= 500) {
          toast.error('Server error. Please try again later.');
        } else if (error.response?.status === 429) {
          toast.error('Too many requests. Please try again later.');
        } else if (error.response?.status !== 401) {
          toast.error(message);
        }

        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  public setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', token);
  }

  public setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('refreshToken', token);
  }

  public clearTokens(): void {
    this.clearToken();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    
    const response = await this.client.post('/auth/refresh-token', { refreshToken });
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  // Order endpoints
  async createOrder(data: any) {
    const response = await this.client.post('/orders', data);
    return response.data;
  }

  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const response = await this.client.get('/orders', { params });
    return response.data;
  }

  async getOrderById(id: string) {
    const response = await this.client.get(`/orders/${id}`);
    return response.data;
  }

  async getOrderByOrderId(orderId: string) {
    const response = await this.client.get(`/orders/order/${orderId}`);
    return response.data;
  }

  async updateOrderStatus(orderId: string, status: string) {
    const response = await this.client.put(`/orders/${orderId}/status`, { status });
    return response.data;
  }

  async verifyQRCode(qrData: string) {
    const response = await this.client.post('/orders/verify-qr', { qrData });
    return response.data;
  }

  async markTicketVerified(orderId: string) {
    const response = await this.client.post(`/orders/verify-ticket/${orderId}`);
    return response.data;
  }

  async getDashboardStats() {
    const response = await this.client.get('/orders/stats');
    return response.data;
  }

  async deleteOrder(orderId: string) {
    const response = await this.client.delete(`/orders/${orderId}`);
    return response.data;
  }

  // Contact endpoints
  async sendContactMessage(data: {
    name: string;
    phone: string;
    email: string;
    message: string;
  }) {
    const response = await this.client.post('/contact', data);
    return response.data;
  }

  async getContactMessages(params?: {
    page?: number;
    limit?: number;
  }) {
    const response = await this.client.get('/contact', { params });
    return response.data;
  }

  async getContactStats() {
    const response = await this.client.get('/contact/stats');
    return response.data;
  }

  async markMessageRead(id: string) {
    const response = await this.client.put(`/contact/${id}/mark-read`);
    return response.data;
  }

  async deleteMessage(id: string) {
    const response = await this.client.delete(`/contact/${id}`);
    return response.data;
  }

  // File upload
  async uploadFile(file: File, fieldName: string = 'file') {
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await this.client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
