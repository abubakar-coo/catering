import { create } from 'zustand';
import { apiClient } from '@/lib/api';

export interface Order {
  id: string;
  orderId: string;
  userId?: string;
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth?: string;
  address?: string;
  requirements?: string;
  eventParticipation: 'YES' | 'NO';
  activities: string[];
  activityDescription?: string;
  ticketType: string;
  quantity: number;
  pricePerTicket: number;
  totalAmount: number;
  paymentMethod: 'JS_BANK' | 'MCB' | 'JAZZCASH';
  paymentScreenshot?: string;
  transactionId?: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'VERIFIED';
  qrCode?: string;
  qrCodeFilename?: string;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  verifiedOrders: number;
  totalRevenue: number;
  totalTicketsSold: number;
}

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface OrderActions {
  // Order management
  createOrder: (data: any) => Promise<Order>;
  fetchOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => Promise<void>;
  fetchOrderById: (id: string) => Promise<Order>;
  fetchOrderByOrderId: (orderId: string) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  
  // QR Code
  verifyQRCode: (qrData: string) => Promise<Order>;
  markTicketVerified: (orderId: string) => Promise<void>;
  
  // Dashboard
  fetchStats: () => Promise<void>;
  
  // UI state
  setCurrentOrder: (order: Order | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

type OrderStore = OrderState & OrderActions;

export const useOrderStore = create<OrderStore>((set, get) => ({
  // Initial state
  orders: [],
  currentOrder: null,
  stats: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },

  // Actions
  createOrder: async (data) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.createOrder(data);
      const order = response.data.order;
      
      set((state) => ({
        orders: [order, ...state.orders],
        currentOrder: order,
        isLoading: false,
      }));
      
      return order;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create order',
        isLoading: false,
      });
      throw error;
    }
  },

  fetchOrders: async (params = {}) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.getOrders(params);
      const { data: orders, pagination } = response.data;
      
      set({
        orders,
        pagination,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch orders',
        isLoading: false,
      });
      throw error;
    }
  },

  fetchOrderById: async (id) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.getOrderById(id);
      const order = response.data.order;
      
      set({
        currentOrder: order,
        isLoading: false,
      });
      
      return order;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch order',
        isLoading: false,
      });
      throw error;
    }
  },

  fetchOrderByOrderId: async (orderId) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.getOrderByOrderId(orderId);
      const order = response.data.order;
      
      set({
        currentOrder: order,
        isLoading: false,
      });
      
      return order;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch order',
        isLoading: false,
      });
      throw error;
    }
  },

  updateOrderStatus: async (orderId, status) => {
    set({ isLoading: true, error: null });
    
    try {
      await apiClient.updateOrderStatus(orderId, status);
      
      set((state) => ({
        orders: state.orders.map((order) =>
          order.orderId === orderId ? { ...order, status: status as any } : order
        ),
        currentOrder: state.currentOrder?.orderId === orderId
          ? { ...state.currentOrder, status: status as any }
          : state.currentOrder,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update order status',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteOrder: async (orderId) => {
    set({ isLoading: true, error: null });
    
    try {
      await apiClient.deleteOrder(orderId);
      
      set((state) => ({
        orders: state.orders.filter((order) => order.orderId !== orderId),
        currentOrder: state.currentOrder?.orderId === orderId ? null : state.currentOrder,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete order',
        isLoading: false,
      });
      throw error;
    }
  },

  verifyQRCode: async (qrData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.verifyQRCode(qrData);
      const order = response.data.order;
      
      set({
        currentOrder: order,
        isLoading: false,
      });
      
      return order;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'QR code verification failed',
        isLoading: false,
      });
      throw error;
    }
  },

  markTicketVerified: async (orderId) => {
    set({ isLoading: true, error: null });
    
    try {
      await apiClient.markTicketVerified(orderId);
      
      set((state) => ({
        orders: state.orders.map((order) =>
          order.orderId === orderId
            ? { ...order, isVerified: true, status: 'VERIFIED' as any }
            : order
        ),
        currentOrder: state.currentOrder?.orderId === orderId
          ? { ...state.currentOrder, isVerified: true, status: 'VERIFIED' as any }
          : state.currentOrder,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to mark ticket as verified',
        isLoading: false,
      });
      throw error;
    }
  },

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.getDashboardStats();
      const stats = response.data;
      
      set({
        stats,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch stats',
        isLoading: false,
      });
      throw error;
    }
  },

  // UI state actions
  setCurrentOrder: (order) => set({ currentOrder: order }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
