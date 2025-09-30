import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';
import { Order } from '@prisma/client';
import { logger } from '@/config/logger';
import env from '@/config/env';

export class QRCodeService {
  private static readonly QR_CODE_DIR = env.QR_CODE_DIR;
  private static readonly QR_CODE_BASE_URL = env.QR_CODE_BASE_URL;

  static async ensureQRCodeDirectory(): Promise<void> {
    try {
      await fs.access(this.QR_CODE_DIR);
    } catch {
      await fs.mkdir(this.QR_CODE_DIR, { recursive: true });
      logger.info(`QR code directory created: ${this.QR_CODE_DIR}`);
    }
  }

  static async generateQRCode(order: Order): Promise<{ qrString: string; filename: string }> {
    try {
      await this.ensureQRCodeDirectory();

      // Create QR code data
      const qrData = {
        orderId: order.orderId,
        customerName: order.fullName,
        ticketType: order.ticketType,
        quantity: order.quantity,
        createdAt: order.createdAt.toISOString(),
      };

      const qrString = `${this.QR_CODE_BASE_URL}/api/verify-qr?data=${encodeURIComponent(JSON.stringify(qrData))}`;

      // Generate QR code image
      const qrCodeBuffer = await QRCode.toBuffer(qrString, {
        type: 'png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 300,
      });

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `qr_${order.orderId}_${timestamp}.png`;
      const filepath = path.join(this.QR_CODE_DIR, filename);

      // Save QR code image
      await fs.writeFile(filepath, qrCodeBuffer);

      logger.info(`QR code generated: ${filename}`);

      return { qrString, filename };
    } catch (error) {
      logger.error('Error generating QR code:', error);
      throw error;
    }
  }

  static async getQRCodeImage(filename: string): Promise<Buffer | null> {
    try {
      const filepath = path.join(this.QR_CODE_DIR, filename);
      const imageBuffer = await fs.readFile(filepath);
      return imageBuffer;
    } catch (error) {
      logger.error('Error reading QR code image:', error);
      return null;
    }
  }

  static async deleteQRCode(filename: string): Promise<void> {
    try {
      const filepath = path.join(this.QR_CODE_DIR, filename);
      await fs.unlink(filepath);
      logger.info(`QR code deleted: ${filename}`);
    } catch (error) {
      logger.error('Error deleting QR code:', error);
      // Don't throw error if file doesn't exist
    }
  }

  static async cleanupOldQRCodes(daysOld: number = 30): Promise<void> {
    try {
      const files = await fs.readdir(this.QR_CODE_DIR);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      for (const file of files) {
        if (file.startsWith('qr_') && file.endsWith('.png')) {
          const filepath = path.join(this.QR_CODE_DIR, file);
          const stats = await fs.stat(filepath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filepath);
            logger.info(`Cleaned up old QR code: ${file}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old QR codes:', error);
    }
  }
}
