# Sada — Production Dockerfile
# Multi-stage build for smaller final image

# Stage 1: Install dependencies
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock* ./
COPY .env.example .env.example
RUN npm install --legacy-peer-deps

# Stage 2: Build
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build standalone output
RUN npm run build

# Stage 3: Production runner
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates wget && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built standalone app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/stats || exit 1

CMD ["node", "server.js"]
