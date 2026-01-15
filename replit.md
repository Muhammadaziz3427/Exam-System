# CD-IELTS Platform

## Overview

CD-IELTS is a secure online IELTS exam administration platform with two primary user interfaces: an admin portal for managing exams and monitoring students, and a student exam environment with lockdown security features. The platform supports listening, reading, and writing exam sections with real-time proctoring, violation tracking, and manual writing assessment grading.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Build Tool**: Vite with custom plugins for Replit integration

**Key Design Decisions**:
- Split-screen 50/50 layout for reading sections using react-resizable-panels
- Lockdown mode using browser Fullscreen API with violation detection
- Material Design-inspired educational interface prioritizing clarity over visual flair
- Custom typography system using Inter, Lora (for reading passages), and Outfit fonts

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: REST endpoints defined in `shared/routes.ts` with Zod validation schemas
- **Authentication**: Session-based auth (simplified for this platform - uses direct password comparison)

**Key Design Decisions**:
- Shared route definitions between client and server for type safety
- Storage abstraction layer (`IStorage` interface) allows swapping implementations
- HTTP server created separately from Express app to support future WebSocket integration

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `db:push` command

**Core Entities**:
- `users` - Admin/teacher accounts
- `exams` - Exam content with JSON structure for sections (listening, reading, writing)
- `examSessions` - One-time student credentials and exam state tracking
- `submissions` - Student answers with grading data
- `violations` - Proctoring violation logs

### Key Features
- **Exam Session Flow**: Generated access codes with one-time passwords, status tracking through created → in_progress → completed → graded
- **Violation Tracking**: Tab switches, fullscreen exits, and other security events logged
- **Writing Grading**: IELTS-style band scoring (0-9 in 0.5 increments) for task response, cohesion, vocabulary, and grammar
- **Live Monitoring**: Admin dashboard with 5-second polling for real-time session status

## External Dependencies

### Database
- **PostgreSQL**: Primary data store (connection via `DATABASE_URL` environment variable)
- **connect-pg-simple**: Session storage for Express sessions

### UI Component Libraries
- **Radix UI**: Full primitive component suite (dialog, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-styled component patterns built on Radix
- **Lucide React**: Icon library
- **embla-carousel-react**: Carousel functionality
- **react-resizable-panels**: Split-screen panel layouts

### Form & Validation
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Zod integration for react-hook-form
- **Zod**: Schema validation (shared between client and server)
- **drizzle-zod**: Auto-generate Zod schemas from Drizzle tables

### Utilities
- **date-fns**: Date formatting and manipulation
- **class-variance-authority**: Variant-based component styling
- **clsx/tailwind-merge**: Conditional class name handling
- **nanoid**: Unique ID generation