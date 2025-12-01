# SoundX

SoundX 是一个基于现代 Web 技术构建的音乐流媒体应用 monorepo，包含桌面端应用（Electron + React）和后端服务（NestJS）。

## 项目结构

本项目采用 pnpm workspace 管理，主要包含以下部分：

- **apps/desktop**: 桌面端应用，基于 Electron、React、Vite 和 Ant Design 构建。
- **services/api**: 后端 API 服务，基于 NestJS 和 Prisma 构建。
- **packages/db**: 共享的数据库模块，包含 Prisma Schema 和 Client。
- **packages/utils**: 共享工具函数库。


## 页面操作指南

需要先登陆，没有就先注册，注册成功后，鼠标放在用户头像处，会弹出一个下拉菜单，点击"数据源设置"，输入对应的后端地址即可

## 本地开发指南

### 前置要求

- Node.js (推荐 v22+)
- pnpm (推荐 v10+)
- Docker (可选，用于本地数据库或完整部署)

### 1. 安装依赖

在项目根目录下运行：

```bash
pnpm install
```

### 2. 数据库设置

本项目使用 SQLite (开发环境) 或 PostgreSQL/MySQL (生产环境)。

初始化数据库并生成 Prisma Client：

```bash
# 生成 Prisma Client
pnpm --filter @soundx/db run generate

# 推送数据库结构 (开发环境 SQLite)
pnpm --filter @soundx/db exec prisma db push
```

### 3. 启动开发环境

在根目录下运行以下命令，将同时启动后端 API 和桌面端应用：

```bash
pnpm run dev
```

该命令会执行以下操作：

1. 构建 `@soundx/utils`
2. 生成 `@soundx/db` 的 Prisma Client
3. 并行启动 API 服务 (`http://localhost:3000`) 和 桌面端应用

## Docker 部署指南

本项目支持使用 Docker Compose 进行一键构建和部署。

### 1. 构建并启动容器

```bash
docker-compose up -d --build
```

此命令将构建两个容器：

- **soundx-api**: 后端服务，运行在 3000 端口。
- **soundx-web**: 前端 Web 服务 (Nginx)，运行在 8080 端口 (映射自容器 80 端口)。

### 2. 访问应用

- **Web 前端**: 访问 `http://localhost:8080`
- **后端 API**: 访问 `http://localhost:3000` (如果端口已映射)

### 3. 停止服务

```bash
docker-compose down
```

### Docker 构建细节

- 使用多阶段构建 (Multi-stage builds) 减小镜像体积。
- `builder` 阶段负责安装依赖、生成 Prisma Client 和构建应用。
- `backend_runner` 阶段仅包含生产依赖和构建产物。
- `frontend_runner` 阶段使用 Nginx 托管前端静态资源。

## 常用命令

- `pnpm run dev`: 启动本地开发环境。
- `pnpm --filter @soundx/db run studio`: 启动 Prisma Studio 查看数据库。
- `pnpm --filter @soundx/api build`: 单独构建 API 服务。
- `pnpm --filter @soundx/desktop build`: 单独构建桌面端应用。

