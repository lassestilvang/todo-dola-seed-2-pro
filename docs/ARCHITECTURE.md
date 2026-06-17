# Architecture

## Overview

Todo Dola Seed 2 Pro is a full-featured task management application with both web and mobile clients.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Web: Next.js 16 + React 19    │  Mobile: React Native    │
│  Tailwind CSS                   │  React Query            │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                 │
├─────────────────────────────────────────────────────────────┤
│  /api/tasks, /api/lists, etc.                             │
│  Service layer pattern (BaseService, TaskService)           │
│  Rate limiting, error handling, validation                  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
├─────────────────────────────────────────────────────────────┤
│  sql.js (client-side)     │  PostgreSQL (server-side)     │
│  SQLite in WebAssembly    │  Drizzle ORM                  │
│  Migrations (21 versions) │  Connection pooling           │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                            │
├─────────────────────────────────────────────────────────────┤
│  AI Services: template-generator, intelligence-service      │
│  Utilities: scheduler, push-notifications, gamification     │
│  Integrations: email-service, context-aware                 │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### Database Layer (`lib/db/`)
- **SQLite in WebAssembly** for client-side storage
- **PostgreSQL** for server-side multi-user support
- **Migration system** with version tracking
- **Connection pooling** and transaction management

### API Layer (`app/api/`, `lib/api/`)
- **Service pattern** for consistent handlers
- **Rate limiting** with Redis fallback
- **Structured error handling** with codes
- **Input validation** with Zod schemas

### Services Layer (`lib/services/`)
- **template-generator.ts** - AI-powered task templates
- **intelligence-service.ts** - Productivity analytics
- **scheduler.ts** - Background job scheduling
- **gamification.ts** - Badges and streaks
- **push-notifications.ts** - Web push support
- **email-service.ts** - Email/SendGrid/SES integration
- **context-aware.ts** - Location/time-based suggestions

### Real-time Collaboration
- **WebSocket server** (`server/websocket-server.ts`)
- **Socket.io-client** integration
- **Presence tracking** and task updates

## Data Flow

1. **Client** makes API request
2. **API Route** calls service layer
3. **Service** processes business logic
4. **Database** persists changes
5. **WebSocket** broadcasts updates to collaborators
6. **Scheduler** handles reminders/notifications

## Configuration

See `.env.example` for required environment variables.