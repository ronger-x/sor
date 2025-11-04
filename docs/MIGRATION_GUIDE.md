# Store 重构迁移指南

## 🎯 概述

本次重构将 859 行的单一 `songs.ts` store 拆分为多个模块，提升了代码的可维护性和可测试性。

## ✅ 好消息：零破坏性变更

**所有现有代码无需修改！** 新架构保持了 100% 的 API 兼容性。

## 📋 变更清单

### 新增文件

#### Composables (逻辑层)

```
app/composables/
├── useAudioPlayer.ts          # 音频播放器管理
├── useLyricSync.ts            # 歌词同步逻辑
├── usePlaylistManagement.ts   # 播放列表管理
├── useMediaSessionAPI.ts      # Media Session API
└── useBufferManagement.ts     # 缓冲管理
```

#### Stores (状态管理层)

```
app/stores/
├── songs.ts          # 主 Store（重构后，整合所有模块）
├── volume.ts         # 音量控制
├── lyrics.ts         # 歌词管理
├── data.ts           # 数据获取
└── songs.old.ts      # 原文件备份（可删除）
```

### 修改文件

- `app/stores/songs.ts` - 完全重构，但 API 保持不变

## 🔍 API 对照表

所有 API 保持不变，以下是完整列表：

### 状态 (State)

| 名称                | 类型                  | 说明             |
| ------------------- | --------------------- | ---------------- |
| `songs`             | `Ref<Song[]>`         | 歌曲列表         |
| `loading`           | `Ref<boolean>`        | 废弃，保留兼容   |
| `homeLoading`       | `Ref<boolean>`        | 首页加载状态     |
| `currentIndex`      | `Ref<number>`         | 当前索引（废弃） |
| `currentSong`       | `Ref<Song \| null>`   | 当前歌曲         |
| `isPlaying`         | `Ref<boolean>`        | 播放状态         |
| `currentTime`       | `Ref<number>`         | 当前播放时间     |
| `duration`          | `Ref<number>`         | 歌曲总时长       |
| `lyrics`            | `Ref<string>`         | 歌词文本         |
| `lyricsLoading`     | `Ref<boolean>`        | 歌词加载状态     |
| `parsedLyrics`      | `Ref<Array>`          | 解析后的歌词     |
| `lyricsModal`       | `Ref<boolean>`        | 歌词弹窗状态     |
| `currentLyricLine`  | `Ref<number>`         | 当前歌词行       |
| `playMode`          | `Ref<string>`         | 播放模式         |
| `playlists`         | `Ref<Array>`          | 播放列表         |
| `currentPlaylistId` | `Ref<string \| null>` | 当前播放列表 ID  |
| `volume`            | `Ref<number>`         | 音量 (0-1)       |
| `muted`             | `Ref<boolean>`        | 静音状态         |
| `bufferedPercent`   | `Ref<number>`         | 缓冲百分比       |
| `bufferedRanges`    | `Ref<Array>`          | 缓冲区间         |

### 计算属性 (Computed)

| 名称                  | 类型                            | 说明                 |
| --------------------- | ------------------------------- | -------------------- |
| `isCurrentSongInList` | `ComputedRef<boolean>`          | 当前歌曲是否在列表中 |
| `currentSongIndex`    | `ComputedRef<number>`           | 当前歌曲索引         |
| `currentPlaylist`     | `ComputedRef<Playlist \| null>` | 当前播放列表         |
| `playlistItems`       | `ComputedRef<Song[]>`           | 当前播放列表歌曲     |
| `hasPrev`             | `ComputedRef<boolean>`          | 是否有上一首         |
| `hasNext`             | `ComputedRef<boolean>`          | 是否有下一首         |

### 方法 (Methods)

#### 播放控制

- `initAudio(audio: HTMLAudioElement)` - 初始化音频元素
- `playSong(index: number)` - 播放指定索引的歌曲
- `togglePlay()` - 播放/暂停切换
- `playNextSong()` - 播放下一首
- `playPrevSong()` - 播放上一首
- `setProgress(seconds: number)` - 设置播放进度
- `updateProgress(time: number, duration: number)` - 更新播放进度

#### 数据获取

- `fetchDefaultSongs()` - 获取默认歌曲列表
- `searchSongs(q?, random?, album?, artist?, limit?, offset?)` - 搜索歌曲 **（扩展）**
- `searchAlbums(artist?)` - 搜索专辑 **（新增）**
- `searchArtists(q?)` - 搜索歌手 **（新增）**

#### 歌词管理

- `showCurrentLyrics()` - 显示当前歌词
- `seekTo(timeMs: number)` - 跳转到指定时间
- `beginSeek()` - 开始拖动进度
- `endSeek()` - 结束拖动进度

#### 播放列表

- `setPlaylist(id, name, items)` - 设置播放列表
- `addToPlaylist(id, items)` - 添加到播放列表
- `setPlayMode(mode)` - 设置播放模式
- `removeSong(index)` - 移除歌曲
- `clearSongs()` - 清空歌曲

#### 音量控制

- `setVolume(volume: number)` - 设置音量
- `toggleMute()` - 切换静音

#### 其他

- `reset()` - 重置播放器
- `dispose()` - 清理资源
- `getAudio()` - 获取音频元素

## 🆕 新功能

### 1. 扩展的搜索功能

```typescript
// 新增参数：album, artist, limit, offset
const results = await songsStore.searchSongs(
  '周杰伦', // 关键词
  false, // 是否随机
  '叶惠美', // 专辑名（新增）
  '周杰伦', // 歌手名（新增）
  20, // 限制数量（新增）
  0 // 偏移量（新增）
)
```

### 2. 搜索专辑

```typescript
const albums = await songsStore.searchAlbums('周杰伦')
```

### 3. 搜索歌手

```typescript
const artists = await songsStore.searchArtists('周杰伦')
```

## 🔧 组件迁移示例

### 旧代码（仍然有效）

```vue
<script setup>
import { useSongsStore } from '@/stores/songs'

const songsStore = useSongsStore()

// 所有原有用法完全不变
await songsStore.fetchDefaultSongs()
await songsStore.playSong(0)
songsStore.setVolume(0.8)
</script>
```

### 新代码（可选，使用子 Store）

如果你想使用更细粒度的状态管理：

```vue
<script setup>
import { useVolumeStore } from '@/stores/volume'
import { useLyricsStore } from '@/stores/lyrics'
import { useDataStore } from '@/stores/data'

const volumeStore = useVolumeStore()
const lyricsStore = useLyricsStore()
const dataStore = useDataStore()

// 使用细分的 store
volumeStore.setVolume(0.8, audioElement)
await lyricsStore.showLyrics('https://...')
const songs = await dataStore.searchSongs('周杰伦')
</script>
```

## 🧪 测试验证

以下组件已验证无需修改：

- ✅ `app/components/SongSearch.vue`
- ✅ `app/components/PlayerBar.vue`
- ✅ `app/components/LyricViewer.vue`
- ✅ `app/pages/index.vue`

## 📦 依赖关系图

```
useSongsStore (主 Store)
├── useVolumeStore
├── useLyricsStore
│   └── useLyricSync (composable)
├── useDataStore
├── useAudioPlayer (composable)
├── usePlaylistManagement (composable)
├── useMediaSessionAPI (composable)
└── useBufferManagement (composable)
```

## 🚀 迁移步骤

### 对于现有项目（推荐）

**无需任何操作！** 所有代码继续正常工作。

### 对于新功能开发

如果你要开发新功能，可以考虑：

1. **直接使用主 Store**（最简单）

   ```typescript
   import { useSongsStore } from '@/stores/songs'
   const songsStore = useSongsStore()
   ```

2. **使用子 Store**（更细粒度）

   ```typescript
   import { useVolumeStore } from '@/stores/volume'
   import { useLyricsStore } from '@/stores/lyrics'
   ```

3. **使用 Composables**（可复用逻辑）
   ```typescript
   import { useLyricSync } from '@/composables/useLyricSync'
   const { parseLRC, findLyricLine } = useLyricSync()
   ```

## 🐛 常见问题

### Q: 我的代码需要修改吗？

**A:** 不需要！所有 API 保持不变。

### Q: 性能会受影响吗？

**A:** 不会。按需导入可能会提升性能。

### Q: 如何回滚？

**A:** 删除新文件，将 `songs.old.ts` 重命名为 `songs.ts`。

### Q: 如何删除备份文件？

**A:** 验证无误后，可以删除 `app/stores/songs.old.ts`。

### Q: 我可以混用新旧 API 吗？

**A:** 可以！你可以在一个组件中同时使用主 Store 和子 Store。

## 📚 进一步学习

- 查看 `docs/STORE_REFACTORING.md` 了解详细架构
- 查看各个 composable 的源码了解实现细节
- 查看各个 store 的源码了解状态管理

## ✅ 验证清单

迁移前请确认：

- [ ] 所有组件编译通过
- [ ] 播放功能正常
- [ ] 歌词显示正常
- [ ] 音量控制正常
- [ ] 播放列表操作正常
- [ ] 搜索功能正常

## 🎉 总结

本次重构实现了：

- ✅ **零破坏性** - 现有代码无需修改
- ✅ **更清晰** - 代码组织更合理
- ✅ **更灵活** - 可按需使用不同粒度的 API
- ✅ **更强大** - 新增专辑和歌手搜索功能
- ✅ **更易维护** - 模块化设计，职责清晰

如有任何问题，请查看源码或联系开发团队。
