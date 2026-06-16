FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the application
FROM deps AS builder
RUN npm install -g pnpm
COPY . .
RUN pnpm run build

# Production server
FROM base AS runner
RUN npm install -g pnpm
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/.next .next
COPY --from=builder /app/public public
COPY --from=builder /app/package.json package.json

# Create database directory
RUN mkdir -p /app/db

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the server
CMD ["pnpm", "start"]