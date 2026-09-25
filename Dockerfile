# ----------------- BASE STAGE -----------------
FROM node:24-alpine AS base

# Keep Corepack's pnpm installation in a shared, read-only location available
# to both root during image builds and node during development/runtime.
ENV COREPACK_HOME="/opt/corepack"

# Enable Corepack shims and preload the exact project package-manager version.
# Network access is disabled for Corepack after this layer.
RUN mkdir -p "$COREPACK_HOME" \
    && corepack enable \
    && corepack install --global pnpm@11.1.3 \
    && chmod -R a+rX "$COREPACK_HOME"
ENV COREPACK_ENABLE_NETWORK=0
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV TZ="America/La_Paz"
ENV NEXT_PUBLIC_TIMEZONE="America/La_Paz"

# Normalize the working directory.
WORKDIR /app

# ----------------- DEVELOPMENT STAGE -----------------
FROM base AS development

# Install Git for attached VS Code Source Control, plus Chromium and its
# runtime fonts/libraries.
RUN apk add --no-cache git chromium nss freetype harfbuzz ca-certificates ttf-freefont tzdata

# Run as the non-root node user.
USER node

# Expose the port used by the development script.
EXPOSE 8002

# Keep the attached development container alive.
CMD ["sleep", "infinity"]


# ----------------- PRODUCTION DEPENDENCIES STAGE -----------------
FROM base AS deps

# Required to fetch the git-based dependency declared in package.json.
RUN apk add --no-cache git

# Copy dependency manifests and pnpm configuration.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Install dependencies using a BuildKit cache for root's default pnpm store.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile


# ----------------- PRODUCTION BUILD STAGE -----------------
FROM base AS builder

# Copy installed modules and application source.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry.
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application.
RUN pnpm build


# ----------------- PRODUCTION RUNTIME STAGE -----------------
FROM base AS runner

# Install Chromium for the PDF routes and tini for the production process.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    tzdata \
    tini

# Configure production runtime variables.
ENV NODE_ENV=production
ENV PORT=8000
ENV NEXT_TELEMETRY_DISABLED=1

# Run as the non-root node user.
USER node

# Copy the optimized Next.js standalone build.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Expose the application port.
EXPOSE 8000

# Use tini as PID 1 and start the standalone Next.js server.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
