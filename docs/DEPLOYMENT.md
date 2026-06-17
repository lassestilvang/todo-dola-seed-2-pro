# Deployment Guide

## Quick Start

### Docker Deployment (Recommended)

```bash
# Clone and configure
git clone <repo-url>
cd todo-dola-seed-2-pro

# Configure environment
cp .env.example .env.production
# Edit .env.production with your values

# Deploy
docker-compose up -d
```

The application will be available at `http://localhost:3000`.

### Manual Deployment

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Start production server
pnpm start
```

## Environment Variables

Required:
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=/app/db/planner.db  # For Docker
```

Optional:
```bash
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Monitoring
SENTRY_DSN=https://key@o456.ingest.sentry.io/project

# Redis (for distributed rate limiting)
REDIS_URL=redis://redis:6379

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Docker Configuration

### docker-compose.yml
- **app**: Main Next.js application
- **worker**: Background job processor
- **redis**: Redis for rate limiting (optional)

### Volumes
- `./db:/app/db` - Persistent database storage

### Ports
- `3000:3000` - Web application
- `6379:6379` - Redis (optional)

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `DATABASE_URL`
- [ ] Set up SMTP for email notifications
- [ ] Configure `SENTRY_DSN` for error tracking
- [ ] Set `REDIS_URL` for distributed deployments
- [ ] Configure `NEXT_PUBLIC_APP_URL`
- [ ] Set up SSL/TLS (use nginx/proxy)
- [ ] Configure backup strategy for `db/planner.db`

## Backup Strategy

```bash
# Automated backup script
#!/bin/bash
cp db/planner.db backups/planner-$(date +%Y%m%d-%H%M%S).db
```

## Scaling

- **Single instance**: Default Docker configuration
- **Load balanced**: Use Redis for session storage
- **Multi-region**: Separate databases per region

## Health Checks

- Application: `GET /api/health` (if implemented)
- Database: Check `db/planner.db` exists
- Redis: `PING` command