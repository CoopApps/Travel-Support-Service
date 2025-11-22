# Use Node with Puppeteer support (Chromium pre-installed)
FROM ghcr.io/puppeteer/puppeteer:24.6.0 AS builder

# Set working directory
WORKDIR /app

# Switch to root for installations
USER root

# Reduce memory usage during npm install
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV npm_config_jobs=2

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies with reduced parallelism to save memory
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy source code
COPY . .

# Build backend
RUN npm run build --workspace=backend

# Build frontend with memory limit
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build --workspace=frontend

# Copy frontend dist to backend public folder
RUN mkdir -p backend/dist/public && \
    cp -r frontend/dist/* backend/dist/public/

# Production stage - smaller image
FROM ghcr.io/puppeteer/puppeteer:24.6.0

WORKDIR /app

USER root

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies only
RUN npm install --workspace=backend --omit=dev --legacy-peer-deps --no-audit --no-fund

# Copy built files from builder
COPY --from=builder /app/backend/dist ./backend/dist

# Set environment
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Switch back to pptruser for security
USER pptruser

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "dist/server.js"]
