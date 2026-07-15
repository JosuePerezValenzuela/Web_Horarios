# ----------------- ETAPA BASE -----------------
FROM node:24-alpine AS base

# Configurar variables de entorno globales para Node y pnpm
ENV PNPM_HOME="/home/node/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOADS=1

# Instalar dependencias del sistema esenciales y tini para gestionar el PID1
RUN apk add --no-cache libc6-compat tini

# Habilitar corepack para usar la versión exacta de pnpm
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

# Normalizar el directorio de trabajo
WORKDIR /app

# Asegurar que el directorio de trabajo pertenezca al usuario node
RUN chown node:node /app


# ----------------- ETAPA DE DESARROLLO (Devcontainer) -----------------
FROM base AS development

# Instalar herramientas para desarrollo, Chromium y fuentes tipográficas
RUN apk add --no-cache git bash chromium nss freetype harfbuzz ca-certificates ttf-freefont

# Configurar variables de entorno para que Puppeteer use el Chromium del sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Cambiar al usuario no-root node
USER node

# Exponer el puerto de desarrollo
EXPOSE 8000

# Comando para mantener el contenedor de desarrollo activo de fondo
CMD ["sleep", "infinity"]


# ----------------- ETAPA DE DEPENDENCIAS (Producción) -----------------
FROM base AS deps

# Copiar archivos de dependencias y configuraciones de pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Instalar dependencias de producción usando cache de pnpm montado
RUN --mount=type=cache,id=pnpm,target=/home/node/.local/share/pnpm/store pnpm install --frozen-lockfile


# ----------------- ETAPA DE CONSTRUCCIÓN (Producción) -----------------
FROM base AS builder

# Copiar módulos instalados y código fuente
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Deshabilitar telemetría de Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Construir la aplicación
RUN pnpm build


# ----------------- ETAPA DE RUNTIME (Producción) -----------------
FROM base AS runner

# Configurar variables de entorno de producción
ENV NODE_ENV=production
ENV PORT=8000
ENV NEXT_TELEMETRY_DISABLED=1

# Cambiar al usuario no-root node
USER node

# Copiar el build optimizado de Next.js (requiere configurar standalone build)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Exponer el puerto de la aplicación
EXPOSE 8000

# Usar tini como PID1 y levantar el servidor standalone de Next.js
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
