import { Request } from 'express';
import { User, Order, ContactMessage, Event, TicketType } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface CreateOrderRequest {
  fullName: string;
  phone: string;
  email: string;
  dateOfBirth?: string;
  address?: string;
  requirements?: string;
  eventParticipation: 'YES' | 'NO';
  activities?: string[];
  activityDescription?: string;
  ticketType: string;
  quantity: number;
  pricePerTicket: number;
  totalAmount: number;
  paymentMethod: 'JS_BANK' | 'MCB' | 'JAZZCASH';
  transactionId?: string;
}

export interface ContactRequest {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export interface UpdateOrderStatusRequest {
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'VERIFIED';
}

export interface QRVerificationRequest {
  qrData: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderWithUser extends Order {
  user?: User | null;
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  verifiedOrders: number;
  totalRevenue: number;
  totalTicketsSold: number;
  totalContactMessages: number;
  unreadContactMessages: number;
}

export interface EmailTemplate {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

export interface QRCodeData {
  orderId: string;
  customerName: string;
  ticketType: string;
  quantity: number;
  createdAt: string;
}

export interface PaymentDetails {
  method: 'JS_BANK' | 'MCB' | 'JAZZCASH';
  accountTitle: string;
  accountNumber: string;
  iban: string;
  amount: number;
}

export interface SocketEvents {
  'order:created': (order: OrderWithUser) => void;
  'order:updated': (order: OrderWithUser) => void;
  'order:status-changed': (orderId: string, status: string) => void;
  'qr:verified': (orderId: string, verified: boolean) => void;
  'message:new': (message: ContactMessage) => void;
}
