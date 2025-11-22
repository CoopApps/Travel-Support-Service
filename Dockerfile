# Build stage - use lightweight Node image
FROM node:22-slim AS builder

WORKDIR /app

# Copy and build backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --legacy-peer-deps --no-audit --no-fund
COPY backend ./backend
RUN cd backend && npm run build

# Copy and build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --legacy-peer-deps --no-audit --no-fund
COPY frontend ./frontend
RUN cd frontend && npm run build

# Copy frontend to backend public
RUN mkdir -p backend/dist/public && cp -r frontend/dist/* backend/dist/public/

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

# Copy built files
COPY --from=builder /app/backend/dist ./dist

ENV NODE_ENV=production
ENV PORT=8080
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 8080
CMD ["node", "dist/server.js"]
