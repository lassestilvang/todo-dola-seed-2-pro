# Setup Guide

## Prerequisites
- Node.js 18+
- pnpm (recommended)
- SQLite (included via sql.js)

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd todo-dola-seed-2-pro

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
pnpm dev
```

## Environment Variables

```env
# Database (optional, uses local SQLite by default)
DATABASE_URL=

# Email Notifications (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Chat Notifications
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=

# OAuth (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=
```

## Email Setup (Gmail Example)

1. Enable 2-factor authentication on Gmail
2. Generate an App Password
3. Set environment variables:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-digit-app-password
   ```

## Mobile App Setup

```bash
cd mobile
npm install
npm run android  # For Android
npm run ios     # For iOS
```

## Building

```bash
# Web app
pnpm build

# Run tests
pnpm test
pnpm vitest run

# Type check
pnpm typecheck
```

## Deployment

The app is designed to run on any platform that supports Node.js. Recommended:

1. **Vercel** - Best for Next.js apps
2. **Netlify** - Good with serverless functions
3. **Railway/Render** - Good for full-stack apps

For mobile deployment:
1. Build Android APK: `cd android && ./gradlew assembleRelease`
2. Build iOS: Open `ios/TodoDola.xcworkspace` in Xcode