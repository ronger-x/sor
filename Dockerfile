# 使用 Node 22 作为基础镜像
FROM node:22-alpine

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制项目文件
COPY . .

# 构建 Nuxt 应用
RUN pnpm build

# 暴露端口（Nuxt 默认 3000）
EXPOSE 3000

# 启动应用
CMD ["node", ".output/server/index.mjs"]
