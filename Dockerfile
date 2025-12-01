# ==========================================
# 阶段 1: 基础环境 (Base)
# ==========================================
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

RUN pnpm install -g @nestjs/cli
RUN pnpm install -g @nestjs/core
RUN pnpm install -g @nestjs/core

# ==========================================
# 阶段 2: 构建器 (Builder) - 构建所有内容
# ==========================================
FROM base AS builder

# 1. 复制所有配置文件 (利用缓存机制)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/utils/package.json ./packages/utils/
COPY services/api/package.json ./services/api/
COPY apps/desktop/package.json ./apps/desktop/

# 2. 安装依赖 (包括开发依赖，因为构建过程需要 TypeScript 等工具)
RUN pnpm install --frozen-lockfile
# 3. 复制源代码
COPY . .

# 4. 关键步骤：生成 Prisma Client
# 必须先执行这一步，否则后续构建 API 和 Desktop 时会报错找不到类型
RUN pnpm --filter @soundx/db exec prisma generate

# 5. 构建 API 服务
# 假设 api 的 build 命令产生 dist 目录
RUN pnpm --filter @soundx/api build

# 6. 构建 Desktop 的 Web 版本
# 假设你的命令是 npm run build，且输出目录为 dist
# 我们这里用 pnpm filter 调用它
RUN pnpm --filter @soundx/desktop run build

# ==========================================
# 阶段 3: API 运行镜像 (Backend Runner)
# ==========================================
FROM base AS backend_runner

WORKDIR /app
ENV NODE_ENV=production

# 1. 复制所有 Monorepo 相关的配置和 API 的 package.json
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/api/package.json ./services/api/
COPY packages/db/package.json ./packages/db/
COPY packages/utils/package.json ./packages/utils/

# 2. 仅安装生产依赖
# pnpm install --prod 会在 /app/node_modules 中创建正确的依赖树，
# 确保所有被提升的包 (如 @prisma/client) 和 workspace 包的链接都正确设置。
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# 3. 复制编译后的代码
# 复制 API 服务的编译结果
COPY --from=builder /app/services/api/dist ./services/api/dist

# 4. 复制 workspace 包的编译结果
# Node.js 运行时需要这些代码才能解析 @soundx/db 和 @soundx/utils
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist

EXPOSE 3000
# 从根目录启动，Node.js 会在 /app/node_modules 中找到所有依赖
CMD ["node", "services/api/dist/main.js"]

# ==========================================
# 阶段 4: Web Nginx 镜像 (Frontend Runner)
# ==========================================
FROM nginx:alpine AS frontend_runner

# 复制 Nginx 配置文件 (假设你在项目根目录有个 nginx.conf)
COPY nginx.conf /etc/nginx/nginx.conf

# 复制构建好的静态文件到 Nginx 目录
# 注意：你需要确认 apps/desktop 打包后的路径，通常是 dist 或 build
COPY --from=builder /app/apps/desktop/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]