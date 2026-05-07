# NotifyHub — Real-Time Notification Engine

A full-stack real-time notification platform built with Next.js, TypeScript, FastAPI, PostgreSQL, Redis, and WebSockets. Supports multi-channel delivery, notification preferences, channel subscriptions, background job processing, and live updates.

## Tech Stack

### Frontend
- **Next.js 14** (App Router, Server Components, Server Actions)
- **React 18** with TypeScript (strict mode)
- **Tailwind CSS** for styling
- **tRPC** for end-to-end type-safe API calls
- **React Query (TanStack Query)** for server state management
- **Zustand** for client state management
- **Socket.io Client** for real-time WebSocket connections
- **Lucide React** for icons
- **class-variance-authority** for component variants

### Backend
- **Next.js API Routes** (tRPC adapter) for CRUD operations
- **Socket.io Server** with Redis Pub/Sub for real-time delivery
- **NextAuth.js** with Prisma Adapter (GitHub OAuth, Google OAuth, Credentials)
- **Prisma ORM** with PostgreSQL
- **Redis** (ioredis) for caching, pub/sub, and stream processing
- **BullMQ** for background job queues (delivery, digest, cleanup)
- **Zod** for runtime schema validation
- **Pino** for structured JSON logging

### Infrastructure
- **Docker** + **Docker Compose** for local development
- **GitHub Actions** CI/CD (lint, type-check, unit tests, E2E tests, deploy)
- **Playwright** for cross-browser E2E testing (Chromium, Firefox, Mobile Chrome)
- **Vitest** + **React Testing Library** for unit/component tests
- **OpenTelemetry** for distributed tracing
- **Vercel** for frontend deployment
- **AWS Lambda + SQS** for serverless event consumers

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│  Next.js App Router │ React │ Tailwind │ Zustand │ React Query│
│                          │                                    │
│              tRPC Client │ Socket.io Client                   │
└──────────────┬───────────┴──────────────┬────────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐    ┌──────────────────────────┐
│   Next.js API Layer  │    │   WebSocket Server       │
│   (tRPC Router)      │    │   (Socket.io + Redis     │
│                      │    │    Pub/Sub)               │
│  - Notifications CRUD│    │                          │
│  - Preferences       │    │  Pushes live updates     │
│  - Channels          │    │  to connected clients    │
│  - Auth (NextAuth)   │    │                          │
└──────┬───────────────┘    └────────────┬─────────────┘
       │                                 │
       ▼                                 ▼
┌──────────────────────┐    ┌──────────────────────────┐
│   PostgreSQL         │    │   Redis                  │
│   (Prisma ORM)       │    │                          │
│                      │    │  - Pub/Sub channels      │
│  - Users & Auth      │    │  - Unread count cache    │
│  - Notifications     │    │  - BullMQ job queues     │
│  - Channels          │    │  - Session store         │
│  - Delivery Logs     │    │                          │
│  - Job Records       │    │                          │
└──────────────────────┘    └──────────┬───────────────┘
                                       │
                                       ▼
                            ┌──────────────────────────┐
                            │   BullMQ Workers         │
                            │                          │
                            │  - Delivery worker       │
                            │  - Digest worker         │
                            │  - Cleanup worker        │
                            └──────────────────────────┘
```

## Features

### Notification Management
- Paginated notification list with cursor-based infinite scroll
- Filter by type (System, Alert, Message, Task, Reminder, Update)
- Filter by priority (Low, Normal, High, Urgent)
- Filter by read/unread status
- Single and batch mark-as-read
- Single and batch archive
- Notification detail view with delivery logs

### Real-Time Delivery
- WebSocket connections via Socket.io with automatic reconnection
- Redis Pub/Sub bridges API mutations to connected clients
- Connection status indicator in sidebar
- Optimistic UI updates via React Query cache invalidation

### Multi-Channel Delivery
- In-app notifications (primary)
- Email delivery (via BullMQ worker)
- Push notification support
- Webhook delivery
- Delivery logging with status tracking and retry counts

### Channel Subscriptions
- Named notification channels (engineering, product, security, system)
- Subscribe/unsubscribe per channel
- Admin broadcast to all channel subscribers
- Channel-based filtering

### Notification Preferences
- Per-user delivery channel toggles (email, push, in-app)
- Digest mode (hourly, daily, weekly) with BullMQ scheduled jobs
- Quiet hours configuration
- Muted notification types

### Authentication & Authorization
- NextAuth.js with JWT session strategy
- GitHub OAuth provider
- Google OAuth provider
- Email/password credentials provider
- Role-based access control (User, Admin)
- Protected tRPC procedures with middleware

### Background Processing (BullMQ)
- Notification delivery queue with concurrency control and rate limiting
- Digest generation on cron schedule
- Expired notification cleanup (daily at 3am)
- Job record tracking in PostgreSQL
- Dead letter queue support

### Observability
- Structured JSON logging with Pino
- OpenTelemetry auto-instrumentation for HTTP, database, Redis
- Health check endpoint (`/api/health`) with database and Redis status
- Request tracing across services

### Frontend Engineering
- Server Components for static content, Client Components for interactivity
- Infinite scroll with Intersection Observer API
- Keyboard navigation and ARIA attributes on notification cards
- Skeleton loading states
- Responsive design with mobile breakpoints
- Custom scrollbar styling
- Tailwind CSS with design tokens (brand colors, surface palette)
- Component variants with class-variance-authority

## Getting Started

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- npm

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/notification-engine.git
cd notification-engine

# Copy environment variables
cp .env.example .env

# Start PostgreSQL and Redis
docker compose up -d postgres redis

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed demo data
npm run db:seed

# Start the development server
npm run dev
```

Open http://localhost:3000 and log in with:
- **Admin:** admin@notifyhub.dev / demo1234
- **User:** demo@notifyhub.dev / demo1234

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests (requires running dev server)
npx playwright install --with-deps
npm run test:e2e

# Type checking
npm run type-check
```

### Docker (Full Stack)

```bash
docker compose up --build
```

## Project Structure

```
notification-engine/
├── prisma/
│   ├── schema.prisma          # Database schema (13 models)
│   └── seed.ts                # Demo data seeder
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── health/route.ts    # Health check endpoint
│   │   ├── dashboard/page.tsx     # Main authenticated view
│   │   ├── login/page.tsx         # Auth page (OAuth + credentials)
│   │   ├── layout.tsx             # Root layout with providers
│   │   ├── globals.css            # Tailwind + custom styles
│   │   └── page.tsx               # Root redirect
│   ├── components/
│   │   ├── layout/
│   │   │   └── sidebar.tsx        # Navigation sidebar
│   │   ├── notifications/
│   │   │   ├── notification-card.tsx  # Single notification display
│   │   │   ├── notification-list.tsx  # Paginated list + infinite scroll
│   │   │   ├── filter-bar.tsx         # Type/priority/read filters
│   │   │   └── stats-bar.tsx          # Dashboard metrics
│   │   ├── ui/
│   │   │   ├── badge.tsx          # Badge with variants
│   │   │   └── button.tsx         # Button with variants
│   │   └── providers.tsx          # tRPC + React Query + NextAuth wrapper
│   ├── hooks/
│   │   └── use-websocket.ts       # WebSocket connection hook
│   ├── lib/
│   │   ├── auth.ts                # NextAuth configuration
│   │   ├── logger.ts              # Pino structured logger
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── redis.ts               # Redis client + BullMQ connection
│   │   ├── telemetry.ts           # OpenTelemetry setup
│   │   ├── trpc.ts                # tRPC client
│   │   └── utils.ts               # Utility functions
│   ├── pages/api/
│   │   ├── auth/[...nextauth].ts  # NextAuth API route
│   │   └── trpc/[trpc].ts        # tRPC API handler
│   ├── server/
│   │   ├── routers/
│   │   │   ├── notification.ts    # Notification CRUD + admin ops
│   │   │   ├── preference.ts      # User preference management
│   │   │   └── channel.ts         # Channel subscription management
│   │   ├── services/
│   │   │   ├── queue.ts           # BullMQ queues and workers
│   │   │   └── websocket.ts       # Socket.io server
│   │   ├── root.ts                # Root tRPC router
│   │   └── trpc.ts                # tRPC init, context, middleware
│   ├── stores/
│   │   └── notification-store.ts  # Zustand client state
│   └── types/
│       └── next-auth.d.ts         # NextAuth type augmentation
├── tests/
│   └── e2e/
│       └── notifications.spec.ts  # Playwright E2E tests (12 tests)
├── .github/workflows/
│   └── ci.yml                     # GitHub Actions pipeline
├── docker-compose.yml             # Local dev infrastructure
├── Dockerfile                     # Multi-stage production build
├── next.config.js
├── tailwind.config.ts
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

## API Reference (tRPC Procedures)

### notification
| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `list` | query | user | Paginated notifications with filters |
| `getById` | query | user | Single notification with delivery logs |
| `unreadCount` | query | user | Cached unread count |
| `stats` | query | user | Dashboard statistics |
| `markAsRead` | mutation | user | Mark single notification as read |
| `markAllAsRead` | mutation | user | Batch mark all as read |
| `archive` | mutation | user | Archive single notification |
| `batchArchive` | mutation | user | Batch archive by IDs |
| `create` | mutation | admin | Create notification for a user |
| `broadcast` | mutation | admin | Broadcast to channel subscribers |

### preference
| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `get` | query | user | Get user preferences (auto-create) |
| `update` | mutation | user | Update notification preferences |

### channel
| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `list` | query | user | List channels with subscription status |
| `subscribe` | mutation | user | Subscribe to a channel |
| `unsubscribe` | mutation | user | Unsubscribe from a channel |
| `create` | mutation | admin | Create a new channel |

## License

MIT
