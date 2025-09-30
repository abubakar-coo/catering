import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/services/authService';
import { logger } from '@/config/logger';

const prisma = new PrismaClient();

async function seed() {
  try {
    logger.info('Starting database seeding...');

    // Create admin user
    await AuthService.createAdminUser();
    logger.info('Admin user created');

    // Create sample ticket types
    const ticketTypes = [
      {
        name: 'VIP',
        description: 'VIP ticket with premium seating and amenities',
        price: 5000,
      },
      {
        name: 'Standard',
        description: 'Standard ticket with general seating',
        price: 3000,
      },
      {
        name: 'Early Bird',
        description: 'Early bird discount ticket',
        price: 2500,
      },
    ];

    for (const ticketType of ticketTypes) {
      await prisma.ticketType.upsert({
        where: { name: ticketType.name },
        update: ticketType,
        create: ticketType,
      });
    }
    logger.info('Ticket types created');

    // Create sample event
    const event = await prisma.event.upsert({
      where: { id: 'sample-event' },
      update: {
        name: 'Once Upon a Wedding',
        description: 'A magical wedding celebration event',
        date: new Date('2025-12-20T18:00:00Z'),
        location: 'Lahore, Pakistan',
        isActive: true,
      },
      create: {
        id: 'sample-event',
        name: 'Once Upon a Wedding',
        description: 'A magical wedding celebration event',
        date: new Date('2025-12-20T18:00:00Z'),
        location: 'Lahore, Pakistan',
        isActive: true,
      },
    });
    logger.info('Sample event created');

    // Create sample users
    const users = [
      {
        email: 'user1@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
      },
      {
        email: 'user2@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567891',
      },
    ];

    for (const userData of users) {
      try {
        await AuthService.register(userData);
        logger.info(`User created: ${userData.email}`);
      } catch (error) {
        logger.warn(`User already exists: ${userData.email}`);
      }
    }

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}

export default seed;
