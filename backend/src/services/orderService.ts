import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { CreateOrderRequest, UpdateOrderStatusRequest, OrderWithUser, PaginationParams, PaginatedResponse } from '@/types';
import { Order, OrderStatus, PaymentMethod } from '@prisma/client';
import { QRCodeService } from './qrCodeService';
import { EmailService } from './emailService';

export class OrderService {
  static async createOrder(data: CreateOrderRequest, userId?: string): Promise<OrderWithUser> {
    try {
      // Generate unique order ID
      const orderId = `OUW${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create order
      const order = await prisma.order.create({
        data: {
          orderId,
          userId,
          fullName: data.fullName,
          phone: data.phone,
          email: data.email,
          dateOfBirth: data.dateOfBirth,
          address: data.address,
          requirements: data.requirements,
          eventParticipation: data.eventParticipation,
          activities: data.activities || [],
          activityDescription: data.activityDescription,
          ticketType: data.ticketType,
          quantity: data.quantity,
          pricePerTicket: data.pricePerTicket,
          totalAmount: data.totalAmount,
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId,
        },
        include: {
          user: true,
        },
      });

      // Generate QR code
      const qrData = await QRCodeService.generateQRCode(order);
      await prisma.order.update({
        where: { id: order.id },
        data: {
          qrCode: qrData.qrString,
          qrCodeFilename: qrData.filename,
        },
      });

      // Send confirmation email
      try {
        await EmailService.sendOrderConfirmation(order);
      } catch (emailError) {
        logger.error('Failed to send confirmation email:', emailError);
        // Don't fail the order creation if email fails
      }

      logger.info(`Order created: ${order.orderId}`);
      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  static async getOrderById(id: string): Promise<OrderWithUser | null> {
    try {
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          user: true,
        },
      });

      return order;
    } catch (error) {
      logger.error('Error fetching order:', error);
      throw error;
    }
  }

  static async getOrderByOrderId(orderId: string): Promise<OrderWithUser | null> {
    try {
      const order = await prisma.order.findUnique({
        where: { orderId },
        include: {
          user: true,
        },
      });

      return order;
    } catch (error) {
      logger.error('Error fetching order by order ID:', error);
      throw error;
    }
  }

  static async getOrders(
    params: PaginationParams = {},
    filters: {
      status?: OrderStatus;
      userId?: string;
      search?: string;
    } = {}
  ): Promise<PaginatedResponse<OrderWithUser>> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.search) {
        where.OR = [
          { fullName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { orderId: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            user: true,
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip,
          take: limit,
        }),
        prisma.order.count({ where }),
      ]);

      return {
        data: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching orders:', error);
      throw error;
    }
  }

  static async updateOrderStatus(
    orderId: string,
    data: UpdateOrderStatusRequest
  ): Promise<OrderWithUser> {
    try {
      const order = await prisma.order.update({
        where: { orderId },
        data: {
          status: data.status,
          updatedAt: new Date(),
        },
        include: {
          user: true,
        },
      });

      // Send appropriate email based on status
      try {
        switch (data.status) {
          case 'CONFIRMED':
            await EmailService.sendFinalTicket(order);
            break;
          case 'CANCELLED':
            await EmailService.sendCancellationEmail(order);
            break;
        }
      } catch (emailError) {
        logger.error('Failed to send status email:', emailError);
        // Don't fail the status update if email fails
      }

      logger.info(`Order status updated: ${orderId} -> ${data.status}`);
      return order;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  static async verifyQRCode(qrData: string): Promise<{ order: OrderWithUser; isValid: boolean }> {
    try {
      const order = await prisma.order.findFirst({
        where: {
          qrCode: qrData,
          isVerified: false,
        },
        include: {
          user: true,
        },
      });

      if (!order) {
        return { order: null as any, isValid: false };
      }

      return { order, isValid: true };
    } catch (error) {
      logger.error('Error verifying QR code:', error);
      throw error;
    }
  }

  static async markTicketVerified(orderId: string): Promise<OrderWithUser> {
    try {
      const order = await prisma.order.update({
        where: { orderId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          status: 'VERIFIED',
        },
        include: {
          user: true,
        },
      });

      logger.info(`Ticket verified: ${orderId}`);
      return order;
    } catch (error) {
      logger.error('Error marking ticket as verified:', error);
      throw error;
    }
  }

  static async getDashboardStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    confirmedOrders: number;
    cancelledOrders: number;
    verifiedOrders: number;
    totalRevenue: number;
    totalTicketsSold: number;
  }> {
    try {
      const [
        totalOrders,
        pendingOrders,
        confirmedOrders,
        cancelledOrders,
        verifiedOrders,
        revenueResult,
        ticketsResult,
      ] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: 'PENDING' } }),
        prisma.order.count({ where: { status: 'CONFIRMED' } }),
        prisma.order.count({ where: { status: 'CANCELLED' } }),
        prisma.order.count({ where: { status: 'VERIFIED' } }),
        prisma.order.aggregate({
          where: { status: { in: ['CONFIRMED', 'VERIFIED'] } },
          _sum: { totalAmount: true },
        }),
        prisma.order.aggregate({
          where: { status: { in: ['CONFIRMED', 'VERIFIED'] } },
          _sum: { quantity: true },
        }),
      ]);

      return {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        cancelledOrders,
        verifiedOrders,
        totalRevenue: revenueResult._sum.totalAmount || 0,
        totalTicketsSold: ticketsResult._sum.quantity || 0,
      };
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  static async deleteOrder(orderId: string): Promise<void> {
    try {
      await prisma.order.delete({
        where: { orderId },
      });

      logger.info(`Order deleted: ${orderId}`);
    } catch (error) {
      logger.error('Error deleting order:', error);
      throw error;
    }
  }
}
