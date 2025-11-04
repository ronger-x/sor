# 首页增强功能

## 更新概览

### 1. 数据获取策略

**采用统一函数控制首页数据获取**

```typescript
// app/stores/data.ts
async function fetchHomeData() {
  homeLoading.value = true
  try {
    const [songsResult, artistsResult, albumsResult] = await Promise.all([
      searchSongs('', true, undefined, undefined, 50),
      searchArtists('', 12),
      searchAlbums('', 12)
    ])
    songs.value = songsResult
    artists.value = artistsResult
    albums.value = albumsResult
    return { songs: songsResult, artists: artistsResult, albums: albumsResult }
  } catch (e) {
    console.error('Failed to fetch home data:', e)
    return { songs: [], artists: [], albums: [] }
  } finally {
    homeLoading.value = false
  }
}
```

**优点：**

- ✅ 统一的 loading 状态管理
- ✅ 并发请求提升性能（使用 `Promise.all`）
- ✅ 更好的错误处理
- ✅ 代码更简洁清晰

### 2. 首页新增功能

#### 2.1 歌手轮播 (Marquee)

- 使用 `UMarquee` 组件展示热门歌手
- 30 秒完成一轮滚动
- 显示歌手头像（圆形）、名称和歌曲数量
- 点击歌手可播放该歌手的歌曲

#### 2.2 专辑轮播 (Marquee)

- 使用 `UMarquee` 组件展示热门专辑
- 35 秒完成一轮滚动，反向滚动
- 显示专辑封面（方形）、名称和歌曲数量
- 点击专辑可播放该专辑的歌曲

#### 2.3 推荐歌曲

- 保留原有的歌曲网格展示
- 添加"换一批"功能

### 3. 新增页面

#### 3.1 歌手页面 (`/artists`)

- 网格展示所有歌手
- 响应式布局：2 列（手机）→ 4 列（平板）→ 6 列（桌面）
- 点击歌手播放该歌手的所有歌曲

#### 3.2 专辑页面 (`/albums`)

- 网格展示所有专辑
- 响应式布局：2 列（手机）→ 4 列（平板）→ 6 列（桌面）
- 点击专辑播放该专辑的所有歌曲

### 4. 导航菜单

在 Header 中添加了导航菜单：

- 🏠 首页
- 🎤 歌手
- 💿 专辑

**响应式设计：**

- 桌面端显示在 Header 中（`md:flex`）
- 移动端可通过 Header 的菜单按钮访问

## 文件更改

### 新增文件

- `app/pages/artists/index.vue` - 歌手列表页面
- `app/pages/albums/index.vue` - 专辑列表页面

### 修改文件

- `app/stores/data.ts` - 添加 `fetchHomeData()` 统一数据获取函数
- `app/stores/songs.ts` - 暴露 `artists` 和 `albums` 数据
- `app/pages/index.vue` - 添加歌手和专辑轮播展示
- `app/layouts/default.vue` - 添加导航菜单

## 响应式状态修复

将所有从其他 store 导出的状态用 `computed()` 包装，解决响应式丢失问题：

```typescript
// ❌ 错误：直接返回 ref 会丢失响应式
return {
  songs: dataStore.songs,
  artists: dataStore.artists
}

// ✅ 正确：使用 computed 保持响应式
return {
  songs: computed(() => dataStore.songs),
  artists: computed(() => dataStore.artists)
}
```

## 使用方式

### 首页数据加载

```typescript
// 自动加载所有数据（推荐）
await songsStore.fetchHomeData()

// 或单独加载
await songsStore.fetchDefaultSongs()
await songsStore.fetchDefaultArtists()
await songsStore.fetchDefaultAlbums()
```

### 访问数据

```vue
<script setup>
const songsStore = useSongsStore()

const songs = computed(() => songsStore.songs)
const artists = computed(() => songsStore.artists)
const albums = computed(() => songsStore.albums)
</script>
```

## 性能优化

1. **并发加载**：使用 `Promise.all` 并发请求三个接口
2. **图片懒加载**：所有图片使用 `loading="lazy"`
3. **响应式布局**：使用 Tailwind 的响应式类
4. **轮播性能**：`UMarquee` 组件使用 CSS 动画，性能优秀

## 下一步建议

- [ ] 添加骨架屏加载状态
- [ ] 添加搜索功能到歌手/专辑页面
- [ ] 添加分页或无限滚动
- [ ] 添加收藏功能
- [ ] 添加最近播放记录
