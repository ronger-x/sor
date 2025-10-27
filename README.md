# 音乐客户端 (Nuxt 3 + @nuxt/ui)

基于 Nuxt 3 和 @nuxt/ui 实现的音乐客户端，支持音乐搜索、播放、歌词显示。

## 数据接口

- 地址：https://music.czx.me:6/songs
- 请求头：X-API-KEY: your-music-api-key
- 查询参数：q: string（名称），limit: number（数量）, random: boolean（是否随机获取）

## 功能

- 搜索歌曲（支持名称模糊查询）
- 展示歌曲封面、歌名、歌手
- 支持在线播放和歌词弹窗

## 开发

安装依赖：

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## 启动开发服务器

启动后访问 http://localhost:3000 ：

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## 构建生产环境

构建应用：

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

本地预览生产环境：

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

更多信息请参考 [Nuxt 官方文档](https://nuxt.com/docs/getting-started/introduction)。
