# ==========================================
# Stage 1: Base
# ==========================================
FROM node:22-alpine AS base

RUN apk update && apk upgrade
RUN apk add --no-cache openssl

RUN npm install -g pnpm
WORKDIR /app

# ==========================================
# Stage 2: Builder（安装依赖 + 构建所有项目 + Prisma generate）
# ==========================================
FROM base AS builder

# 1. 复制 lock + workspace 配置，触发 Docker 缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 2. 复制所有子包 package.json
COPY packages/db/package.json ./packages/db/
COPY packages/utils/package.json ./packages/utils/
COPY services/api/package.json ./services/api/
COPY apps/desktop/package.json ./apps/desktop/

# 3. 安装依赖
RUN pnpm install --frozen-lockfile

# 4. 复制完整源码
COPY . .

# 5. 构建所有 workspace
RUN pnpm --filter @soundx/utils build
RUN pnpm --filter @soundx/db build

# 6. Prisma generate（确保生成到 packages/db/generated/client）
RUN pnpm --filter @soundx/db run generate

RUN pnpm --filter @soundx/api build
RUN pnpm --filter @soundx/desktop build

# ==========================================
# Stage 3: Backend Runner（只放生产依赖 + dist + prisma client）
# ==========================================
FROM node:22-slim AS backend_runner
WORKDIR /app

ENV NODE_ENV=production

# 1. 复制必要文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json      ./packages/db/
COPY packages/utils/package.json   ./packages/utils/
COPY services/api/package.json     ./services/api/

# 2. 安装生产依赖
RUN apt-get update -y && apt-get install -y openssl
RUN npm i -g pnpm && pnpm install --prod --frozen-lockfile --ignore-scripts

# 3. 复制构建产物 + prisma client
COPY --from=builder /app/packages/db/dist       ./packages/db/dist
COPY --from=builder /app/packages/utils/dist    ./packages/utils/dist
COPY --from=builder /app/services/api/dist      ./services/api/dist
COPY --from=builder /app/apps/desktop/dist      ./apps/desktop/dist

EXPOSE 3000
CMD ["node", "services/api/dist/main.js"]

# ==========================================
# Stage 4: Frontend Runner（Nginx 承载 web）
# ==========================================
FROM nginx:alpine AS frontend_runner

# 拷贝 Nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 拷贝前端构建产物
COPY --from=builder /app/apps/desktop/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
