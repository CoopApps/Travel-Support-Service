# Use Node with Puppeteer support (Chromium pre-installed)
FROM ghcr.io/puppeteer/puppeteer:24.6.0 AS builder

WORKDIR /app
USER root

# Reduce memory usage
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Copy ALL files first (simpler approach)
COPY . .

# Install and build in one layer
RUN cd backend && npm install --legacy-peer-deps --no-audit --no-fund && npm run build
RUN cd frontend && npm install --legacy-peer-deps --no-audit --no-fund && npm run build

# Copy frontend to backend public
RUN mkdir -p backend/dist/public && cp -r frontend/dist/* backend/dist/public/

# Production stage
FROM ghcr.io/puppeteer/puppeteer:24.6.0

WORKDIR /app/backend
USER root

# Copy backend package.json and install prod deps
COPY backend/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund

# Copy built files
COPY --from=builder /app/backend/dist ./dist

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

USER pptruser
EXPOSE 3000
CMD ["node", "dist/server.js"]
