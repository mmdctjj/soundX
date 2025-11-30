# Build stage
FROM --platform=linux/amd64 node:22-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy packages
COPY packages/db ./packages/db
COPY packages/utils ./packages/utils
COPY services/api ./services/api
COPY apps/desktop ./apps/desktop

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages/db with retry logic for Prisma
WORKDIR /app/packages/db
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl,linux-musl-openssl-3.0.x
# Generate Prisma client with retries
RUN for i in 1 2 3; do pnpm run generate && break || sleep 5; done && pnpm run build

# Build packages/utils
WORKDIR /app/packages/utils
RUN pnpm run build

# Build API service
WORKDIR /app/services/api
RUN pnpm run build

# Build Desktop App (Web)
WORKDIR /app/apps/desktop
RUN pnpm run build:web

# Deploy API service to /prod/api (this creates a self-contained app with prod deps)
WORKDIR /app
RUN pnpm --filter=api --prod deploy --legacy /prod/api

# Production stage
FROM --platform=linux/amd64 node:22-alpine

# Install Nginx
RUN apk add --no-cache nginx

WORKDIR /app

# Copy the deployed API application
COPY --from=builder /prod/api ./services/api

# Copy built frontend files to Nginx directory
COPY --from=builder /app/apps/desktop/dist /usr/share/nginx/html

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'nginx' >> /start.sh && \
    echo 'cd /app/services/api && node dist/main.js' >> /start.sh && \
    chmod +x /start.sh

# Expose Nginx port
EXPOSE 80

# Start both services
CMD ["/start.sh"]
