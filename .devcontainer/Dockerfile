FROM node:24-alpine

RUN apk add --no-cache git bash libc6-compat

# Corepack: habilita y prepara pnpm en la versión exacta
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

# Crear el workspace con permisos para node ANTES de cambiar de usuario
RUN mkdir -p /workspace/Web_Horarios && chown node:node /workspace/Web_Horarios

# Usuario node (no-root) — ya existe en la imagen
USER node

# Directorio de trabajo — el código se monta por volumen
WORKDIR /workspace/Web_Horarios

# pnpm-store por defecto en Alpine para el usuario node
# Se persiste con un volumen nombrado en docker-compose
ENV PNPM_HOME=/home/node/.local/share/pnpm
