# ============ 构建阶段 ============
FROM node:22-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 安装 pnpm 并安装依赖
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# 复制项目文件并构建
COPY . .
RUN pnpm build

# ============ 运行阶段 ============
FROM node:22-alpine AS runner

WORKDIR /app

# 只复制构建产物（Nuxt 3 的 .output 是完全独立的）
COPY --from=builder /app/.output ./.output

# 暴露端口
EXPOSE 3000

# 使用非 root 用户运行（安全最佳实践）
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxt && \
    chown -R nuxt:nodejs /app

USER nuxt

# 启动应用
CMD ["node", ".output/server/index.mjs"]
