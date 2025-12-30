# =============================================================================
# BUILD STAGE - Compile TypeScript and build all packages
# =============================================================================
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all package.json files for dependency resolution
COPY packages/dproc-core/package.json ./packages/dproc-core/
COPY apps/dproc-web/package.json ./apps/dproc-web/

# Install ALL dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY packages ./packages
COPY apps ./apps
COPY tsconfig.json ./

# Build packages in correct order
RUN pnpm --filter @aganitha/dproc-core build
RUN pnpm --filter dproc-web build

# =============================================================================
# PRODUCTION STAGE - Minimal runtime image
# =============================================================================
FROM node:20-alpine

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install pnpm and tsx for running TypeScript
RUN npm install -g pnpm tsx

WORKDIR /app

# Copy workspace configuration
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./

# Copy built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps ./apps

# Create workspace directories
RUN mkdir -p /shared/dproc-workspace/pipelines \    
             /app/data

# Make CLI binaries executable
RUN chmod +x /app/packages/dproc-core/bin/dproc.js 2>/dev/null || true
RUN chmod +x /app/packages/dproc-core/bin/dproc-worker.js 2>/dev/null || true

# Set environment variables
ENV NODE_ENV=production
ENV DPROC_WORKSPACE=/shared/dproc-workspace
ENV DATA_DIR=/app/data
ENV NODE_OPTIONS="--import tsx/esm"
ENV PORT=3000

# Expose web UI port
EXPOSE 3000

# Health check for web service
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/stats', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Default command runs the web UI
# Worker is started separately in docker-compose
CMD ["pnpm", "--filter", "dproc-web", "start"]