# SOR 音乐客户端 (Nuxt 3 + @nuxt/ui)

一个基于 Nuxt 3 与 @nuxt/ui 构建的轻量音乐客户端。提供搜索、在线播放、封面展示与歌词查看等功能，适合用作演示、个人歌单工具或轻量前端播放器。

核心技术栈：

- Nuxt 3
- @nuxt/ui（UI 组件）
- Pinia（状态管理）

## 数据接口

- 地址（示例）：your-music-api-url（请将实际 API Url 配置到运行环境中，项目运行时会通过环境变量读取）
- 请求头：X-API-KEY: your-music-api-key（请将实际 API Key 配置到运行环境中，项目运行时会通过环境变量读取）
- 查询参数：
  - q: string（歌曲或歌手名称，支持模糊搜索）
  - limit: number（返回数量）
  - random: boolean（是否随机返回）

注：后端 API 可能需要额外的授权头，请参考你的 API 提供方。

## 功能特性

- 搜索歌曲（名称/歌手模糊匹配）
- 列表展示：歌曲封面、歌名、歌手信息
- 播放控制：播放/暂停、进度显示（基于浏览器 Audio）
- 歌词展示：歌词弹窗或浮层显示，支持同步滚动
- 响应式 UI：桌面与移动设备均可使用

## 本地开发

1. 安装依赖（推荐使用 pnpm）：

```bash
# pnpm
pnpm install

# 或使用 npm/yarn
npm install
yarn install
```

2. 启动开发服务器：

```bash
pnpm dev
# 或
npm run dev
```

访问 http://localhost:3000

3. 构建与预览（本地生产构建）：

```bash
pnpm build
pnpm preview
```

更多开发细节请参考 Nuxt 官方文档： https://nuxt.com/docs/getting-started/introduction

## 服务器部署教程（Docker / Docker Compose）

下面给出一份简单、可靠的生产部署指南，适用于大多数 Linux 服务器或在 Windows 上使用 Docker Desktop 的场景。

先决条件：

- 已安装 Docker（以及可选的 Docker Compose）
- 拥有后端音乐 API 的访问地址
- 拥有后端音乐 API 的访问 Key（见上文的 X-API-KEY）

推荐做法：

- 将 API Url 设置为环境变量 `NUXT_MUSIC_API_URL`，程序会从环境中读取并在请求时使用。
- 将 API key 设置为环境变量 `NUXT_MUSIC_API_KEY`，程序会从环境中读取并在请求时使用。

1. 使用仓库自带的 `Dockerfile` 构建镜像并运行（PowerShell 示例）

```powershell
# 在仓库根目录运行（Windows PowerShell / pwsh）
docker build -t sor:latest .

# 直接运行容器（设置环境变量并映射端口到主机）
docker run -d --name sor -p 3000:3000 -e NUXT_MUSIC_API_URL="your-music-api-url" -e NUXT_MUSIC_API_KEY="your-music-api-key" sor:latest

# 查看日志
docker logs -f sor

# 停止并移除
docker stop sor; docker rm sor
```

2. 使用 `docker compose`（倘若你想要用 `compose.yaml` 管理）

在仓库根目录创建一个 `.env` 文件（或在 CI/CD 中以机密方式设置环境变量）：

```
NUXT_MUSIC_API_URL=your-music-api-url
NUXT_MUSIC_API_KEY=your-music-api-key
```

然后使用以下命令启动：

```powershell
docker compose -f compose.yaml --env-file .env up -d

# 查看服务状态和日志
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs -f

# 停止服务
docker compose -f compose.yaml down
```

说明：仓库内的 `compose.yaml` 已将容器端口 3000 映射到宿主机 3000（见项目根目录的 `compose.yaml`）。根据你所在网络或反向代理配置，可调整为 80 或 443 并配合 Nginx/Traefik 做 TLS。

3. 在生产环境的建议配置

- 使用反向代理（Nginx / Caddy / Traefik）来管理 TLS、域名与负载均衡。
- 使用进程/容器编排（systemd / docker compose / k8s）确保服务开机自启与自动重启。
- 将敏感环境变量写入受限的宿主机环境（或使用 Vault / cloud secrets）。

示例：使用 Nginx 做反向代理（简要片段）

```
server {
		listen 80;
		server_name example.com;

		location / {
				proxy_pass http://127.0.0.1:3000;
				proxy_set_header Host $host;
				proxy_set_header X-Real-IP $remote_addr;
				proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		}
}
```

4. 常见排错命令

```powershell
# 查看容器日志
docker logs -f sor

# compose 模式下查看所有服务日志
docker compose -f compose.yaml logs -f

# 检查容器是否在监听预期端口
docker ps --filter "name=sor"
```

## 配置说明

- 环境变量：
  - NUXT_MUSIC_API_URL：用于访问歌曲 API 的 Url（必须）
  - NUXT_MUSIC_API_KEY：用于访问歌曲 API 的 Key（必须）

## 常见问题

- Q：如何更改绑定端口？

  - A：可在 `docker run` 时改变 `-p HOSTPORT:3000`，或修改 `compose.yaml` 中的端口映射。

- Q：如何在 HTTPS 下运行？
  - A：建议在反向代理（例如 Nginx 或 Traefik）中终止 TLS，并将反向代理转发到内部容器端口。

## 贡献

欢迎提交 issue 或 PR。请在 PR 中简述变更目标与测试步骤。

---

更多细节请参考 Nuxt 文档： https://nuxt.com/docs/getting-started/introduction
