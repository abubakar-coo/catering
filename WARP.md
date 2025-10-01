# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Architecture Overview

**IMPORTANT**: This project has been completely restructured from a legacy dual-architecture system to a modern **Next.js 14 full-stack application**.

### Current Architecture (New - Use This!)
- **Framework**: Next.js 14 with App Router
- **Frontend**: React with TypeScript, preserving original HTML/CSS/JS libraries
- **Backend**: Next.js API routes with Prisma ORM
- **Database**: Vercel Postgres (PostgreSQL)
- **Storage**: Vercel Blob Storage for file uploads
- **UI**: Shadcn/UI components for admin panel, original CSS for frontend
- **Styling**: Tailwind CSS + preserved original stylesheets
- **Notifications**: Sonner for toast notifications

### Legacy Architecture (Deprecated)
- **Root Level**: `server.js` - Express.js server (DEPRECATED)
- **Backend/Frontend Directories**: Separate TypeScript projects (DEPRECATED)

The new system serves as a **catering website** and **event ticketing platform** with a modern admin panel built using Shadcn/UI components.

## Development Commands

**IMPORTANT**: Work in the `catering-nextjs/` directory for the new Next.js application.

### Next.js Development (Primary)
```bash
cd catering-nextjs
npm install                  # Install all dependencies

# Development
npm run dev                  # Start Next.js dev server on http://localhost:3000
npm run build                # Build for production
npm start                    # Start production build
npm run lint                 # Lint with ESLint
```

### Database Management
```bash
cd catering-nextjs

# Prisma Commands
npm run db:generate          # Generate Prisma client
npm run db:push             # Push schema changes to database
npm run db:migrate          # Run database migrations
npm run db:studio           # Open Prisma Studio GUI
npm run db:seed             # Seed database with initial data
npm run db:reset            # Reset database (destructive!)
```

### Vercel Deployment
```bash
cd catering-nextjs

# Setup (run once)
vercel link                  # Link project to Vercel
vercel storage create postgres catering-db    # Create database
vercel storage create blob catering-uploads   # Create blob storage
vercel env pull .env.local   # Pull environment variables

# Deploy
vercel --prod               # Deploy to production
vercel                      # Deploy to preview
```

### Legacy Commands (Deprecated)
```bash
# DON'T USE THESE - For reference only
node server.js              # Old Express server
cd backend && npm run dev   # Old backend
cd frontend && npm run dev  # Old frontend
```

## Project Structure

### Database Models (Prisma)
- **User**: Admin/customer accounts with role-based access
- **Order**: Ticket orders with QR codes, payment verification, and status tracking
- **ContactMessage**: Customer inquiries with status management
- **Event**: Event information and metadata
- **TicketType**: Available ticket types and pricing

### Key Enums
- `OrderStatus`: PENDING, CONFIRMED, CANCELLED, VERIFIED
- `PaymentMethod`: JS_BANK, MCB, JAZZCASH
- `EventParticipation`: YES, NO
- `UserRole`: ADMIN, USER

### Backend Architecture (`/backend/src/`)
- **config/**: Database and application configuration
- **controllers/**: Request handlers for different endpoints
- **middleware/**: Authentication, validation, and security middleware
- **routes/**: API route definitions
- **services/**: Business logic layer
- **types/**: TypeScript type definitions

### Frontend Architecture (`/frontend/src/`)
- **app/**: Next.js 14 app router pages and layouts
- **components/**: Reusable UI components with Radix UI
- **lib/**: Utility functions and configurations
- **store/**: State management with Zustand

## Development Workflows

### Database Changes
1. Modify `backend/prisma/schema.prisma`
2. Run `npm run db:generate` to update Prisma client
3. Run `npm run db:push` for development or `npm run db:migrate` for production

### Adding New API Endpoints
1. Define types in `backend/src/types/`
2. Create controller in `backend/src/controllers/`
3. Add routes in `backend/src/routes/`
4. Add middleware if needed in `backend/src/middleware/`

### Frontend Components
- Use Radix UI primitives for consistent design
- Implement proper TypeScript interfaces
- Follow the component structure in existing files
- Use Zustand for global state management

### Testing Strategy
- Backend: Unit tests with Vitest
- API endpoints: Integration testing
- Database: Test with separate test database
- Frontend: Component testing (when needed)

## Environment Configuration

### Backend Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/catering_db"

# JWT
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"

# Email (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="your-email@gmail.com"

# Frontend URL
FRONTEND_URL="http://localhost:3000"
```

### Frontend Environment Variables
```bash
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_SOCKET_URL="http://localhost:5000"
```

## Important Implementation Details

### QR Code Generation
- Orders automatically generate QR codes using the `qrcode` library
- QR codes are stored as files and referenced in the database
- Used for event check-in and order verification

### Payment Verification
- Supports file uploads for payment screenshots
- Multiple payment methods: JS Bank, MCB, JazzCash
- Admin verification workflow for payment confirmation

### Real-time Features
- Socket.IO integration for live order updates
- Admin dashboard receives real-time notifications
- Order status changes broadcast to connected clients

### File Upload Handling
- Multer configuration for payment screenshots
- Sharp for image optimization
- Proper file validation and storage

## Deployment Notes

### Production Checklist
1. Set secure JWT secrets
2. Configure proper SMTP credentials
3. Set up PostgreSQL database
4. Configure Nginx reverse proxy
5. Set proper environment variables
6. Run database migrations
7. Build frontend and backend

### Container Services
- **postgres**: PostgreSQL database with persistent volume
- **backend**: Node.js API server with TypeScript
- **frontend**: Next.js application
- **nginx**: Reverse proxy with SSL termination

The Docker setup includes both development and production configurations with proper networking, volume mounting, and resource limits.