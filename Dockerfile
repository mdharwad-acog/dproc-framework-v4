# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app
# Copy npmrc for private registry access
COPY .npmrc ./

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/dproc-types/package.json ./packages/dproc-types/
COPY packages/dproc-core/package.json ./packages/dproc-core/
COPY packages/dproc-cli/package.json ./packages/dproc-cli/
COPY apps/dproc-web/package.json ./apps/dproc-web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages ./packages
COPY apps ./apps
COPY tsconfig.json ./

# Build all packages
RUN pnpm --filter @dproc/types build
RUN pnpm --filter @dproc/core build
RUN pnpm --filter @dproc/cli build
RUN pnpm --filter dproc-web build
# Production stage
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm tsx

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps ./apps

# Create workspace directory
RUN mkdir -p /shared/dproc-workspace/pipelines

# Make scripts executable
RUN chmod +x /app/packages/dproc-cli/dist/index.js 2>/dev/null || true
RUN chmod +x /app/packages/dproc-cli/dist/worker.js 2>/dev/null || true

# Set environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--import tsx/esm"
ENV DPROC_WORKSPACE=/shared/dproc-workspace
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/stats', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Default command (web - can be overridden in docker-compose)
CMD ["pnpm", "--filter", "dproc-web", "start"]
