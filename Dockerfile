# Build stage - use lightweight Node image
FROM node:22-slim AS builder

# CRITICAL: Force complete cache invalidation - timestamp changes every build
RUN echo "Build started at: $(date)" && date +%s%N > /tmp/build_id

WORKDIR /app

# Build backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --legacy-peer-deps --no-audit --no-fund
RUN echo "Backend build timestamp: $(date +%s)"
COPY backend ./backend
RUN cd backend && rm -rf dist || true
RUN cd backend && npm run build

# Build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --legacy-peer-deps --no-audit --no-fund
RUN echo "Frontend build timestamp: $(date +%s)"
COPY frontend ./frontend
RUN cd frontend && rm -rf dist node_modules/.vite || true
RUN cd frontend && npm run build 2>&1 | tee /tmp/vite.log || (cat /tmp/vite.log && exit 1)
RUN echo "=== Vite build output ===" && cat /tmp/vite.log
RUN echo "=== dist directory structure ===" && find frontend/dist -type f | head -30
RUN echo "=== Assets directory ===" && ls -lah frontend/dist/assets/ 2>/dev/null || echo "No assets directory"

# Copy frontend to backend public - ensure clean copy
RUN rm -rf backend/dist/public || true
RUN mkdir -p backend/dist/public && cp -r frontend/dist/* backend/dist/public/
RUN echo "=== ALL Copied to backend/dist/public ===" && ls -lah backend/dist/public/assets/

# Production stage - use Puppeteer image for Chromium
FROM node:22-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Copy backend package.json and install prod deps
COPY backend/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund

# Bust cache for production stage
RUN echo "Production stage cache bust: $(date +%s)"

# Copy built backend files (includes frontend in dist/public from builder stage line 22)
COPY --from=builder /app/backend/dist ./dist

ENV NODE_ENV=production
ENV PORT=8080
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 8080
CMD ["node", "dist/server.js"]
