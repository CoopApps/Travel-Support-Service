# Infrastructure & DevOps Setup Guide

## Overview

This document provides the complete infrastructure setup for the Travel Support Platform, including Docker, CI/CD, and deployment configuration.

---

## 1. Database Migrations

### Status: ✅ Already Configured

The project uses `node-pg-migrate` for database migrations.

**Commands:**
```bash
# Create a new migration
npm run migrate:create your-migration-name

# Run migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down
```

**Location:** `backend/src/migrations/`

---

## 2. Docker Setup

### Dockerfile for Backend

Create `backend/Dockerfile`:

```dockerfile
# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/migrations ./src/migrations

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/server.js"]
```

### docker-compose.yml

Create `docker-compose.yml` in root:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: travel-support-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-travel_support}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "-E UTF8 --locale=en_US.UTF-8"
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/src/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - travel-support-network

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: travel-support-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-travel_support}
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      GOOGLE_MAPS_API_KEY: ${GOOGLE_MAPS_API_KEY}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:3000}
    ports:
      - "${PORT:-3001}:3001"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend/logs:/app/logs
    networks:
      - travel-support-network

  # Redis (optional - for caching)
  redis:
    image: redis:7-alpine
    container_name: travel-support-redis
    restart: unless-stopped
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - travel-support-network

  # Frontend (Vue/React if needed)
  # frontend:
  #   build:
  #     context: ./frontend
  #     dockerfile: Dockerfile
  #   container_name: travel-support-frontend
  #   restart: unless-stopped
  #   ports:
  #     - "3000:80"
  #   depends_on:
  #     - backend
  #   networks:
  #     - travel-support-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  travel-support-network:
    driver: bridge
```

### .dockerignore

Create `backend/.dockerignore`:

```
node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
README.md
.vscode
.idea
*.md
dist
coverage
.nyc_output
logs
*.log
```

---

## 3. CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20.x'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Lint and Type Check
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run ESLint
        working-directory: ./backend
        run: npm run lint

      - name: TypeScript type check
        working-directory: ./backend
        run: npm run typecheck

  # Run Tests
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: travel_support_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run tests
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/travel_support_test
          JWT_SECRET: test-secret-key-for-ci
          ENCRYPTION_KEY: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
        run: npm run test:ci

      - name: Upload coverage reports
        uses: codecov/codecov-action@v4
        with:
          files: ./backend/coverage/lcov.info
          fail_ci_if_error: false

  # Build Docker Image
  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    if: github.event_name == 'push'

    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Deploy to Production (optional)
  deploy:
    needs: [build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm install -g @railway/cli
          railway up --service backend

      # OR deploy to your own server
      # - name: Deploy to Server
      #   uses: appleboy/ssh-action@v1.0.0
      #   with:
      #     host: ${{ secrets.SERVER_HOST }}
      #     username: ${{ secrets.SERVER_USER }}
      #     key: ${{ secrets.SSH_PRIVATE_KEY }}
      #     script: |
      #       cd /var/www/travel-support
      #       git pull origin main
      #       docker-compose pull
      #       docker-compose up -d --build
```

---

## 4. Environment Management

### Environment Files Structure

```
backend/
  ├── .env.example          # Template (committed to repo)
  ├── .env                  # Local development (gitignored)
  ├── .env.development      # Dev environment
  ├── .env.staging          # Staging environment
  └── .env.production       # Production (use secrets manager)
```

### Load Environment Script

Create `backend/src/config/environment.ts`:

```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific file
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, `../../${envFile}`) });

export const config = {
  env,
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'travel_support',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRATION || '24h',
  },
  // ... other config
};

// Validate required environment variables
const required = ['JWT_SECRET', 'ENCRYPTION_KEY', 'DB_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
```

---

## 5. Production Deployment

### Railway.app (Current)

1. Connect GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main

### Self-Hosted Server

1. **Prerequisites:**
   ```bash
   # Install Docker and Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

2. **Deploy:**
   ```bash
   # Clone repository
   git clone <your-repo>
   cd travel-support-app

   # Copy and configure environment
   cp backend/.env.example backend/.env
   nano backend/.env  # Edit with production values

   # Start services
   docker-compose up -d

   # Run migrations
   docker-compose exec backend npm run migrate:up
   ```

3. **Setup Nginx Reverse Proxy:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 6. Monitoring & Logging

### Application Logs

- **Development:** Console output
- **Production:** Winston logger to files + external service

### Health Checks

Endpoint: `GET /api/health`

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

### Metrics to Monitor

1. **Application:**
   - Response times
   - Error rates
   - Request counts
   - Active connections

2. **Database:**
   - Query performance
   - Connection pool usage
   - Deadlocks

3. **Infrastructure:**
   - CPU usage
   - Memory usage
   - Disk space
   - Network I/O

---

## 7. Security Checklist

- [ ] All secrets in environment variables (not code)
- [ ] SSL/TLS enabled for production
- [ ] Database connections encrypted
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Helmet security headers enabled
- [ ] SQL injection protection (parameterized queries)
- [ ] Input validation on all endpoints
- [ ] Authentication on protected routes
- [ ] Regular security updates (Dependabot enabled)

---

## 8. Backup Strategy

### Database Backups

```bash
# Automated daily backup
0 2 * * * docker-compose exec -T postgres pg_dump -U postgres travel_support | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Retention: Keep 30 days
find /backups -name "db-*.sql.gz" -mtime +30 -delete
```

### Disaster Recovery

1. Keep backups in multiple locations (local + cloud)
2. Test restore procedure monthly
3. Document recovery steps
4. Keep infrastructure-as-code in version control

---

## 9. Performance Optimization

1. **Database:**
   - Add indexes on frequently queried columns
   - Use connection pooling
   - Enable query caching with Redis

2. **Application:**
   - Enable gzip compression
   - Use CDN for static assets
   - Implement request caching

3. **Infrastructure:**
   - Horizontal scaling with load balancer
   - Separate read replicas for heavy queries
   - Use Redis for session storage

---

## 10. Troubleshooting

### Common Issues

**Container won't start:**
```bash
docker-compose logs backend
docker-compose ps
```

**Database connection fails:**
```bash
docker-compose exec postgres psql -U postgres
# Check if database exists
\l
```

**Migrations fail:**
```bash
# Check migration status
npm run migrate:status

# Reset migrations (DANGER: data loss)
docker-compose down -v
docker-compose up -d
npm run migrate:up
```

---

## Next Steps

1. Review and customize Docker configuration
2. Set up CI/CD secrets in GitHub
3. Configure production environment variables
4. Test deployment in staging environment
5. Set up monitoring and alerting
6. Create runbook for common operations

---

**Questions or issues?** Check logs first, then review this guide.
