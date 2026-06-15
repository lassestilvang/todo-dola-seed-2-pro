# Deployment Guide

## Quick Deploy to Vercel

```bash
pnpm build
vercel --prod
```

## Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL=sqlite:///db/planner.db

# API
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Deployment Steps

### Vercel (Recommended)

1. Push to your main branch
2. Import project at vercel.com
3. Configure environment variables
4. Deploy

### Self-hosted

1. Build the application:
   ```bash
   pnpm build
   ```

2. Start the server:
   ```bash
   pnpm start
   ```

3. The app will be available at `http://localhost:3000`

## Database Migration

The app uses automatic migrations. When you deploy:

1. New migrations are applied automatically
2. Backup your database before major updates
3. Check `lib/db/migrations.ts` for migration history

## Production Checklist

- [ ] Set `DATABASE_URL` environment variable
- [ ] Configure email settings (optional)
- [ ] Enable HTTPS
- [ ] Set up backup cron job
- [ ] Configure rate limiting
- [ ] Review security headers
