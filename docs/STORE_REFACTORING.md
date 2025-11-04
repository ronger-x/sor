# Store 重构架构文档

## 📁 新架构概览

重构后的代码按照功能模块进行了清晰的拆分，提高了可维护性、可测试性和代码复用性。

```
app/
├── composables/                      # 可复用的逻辑函数
│   ├── useAudioPlayer.ts            # 音频播放器管理 (~15 行)
│   ├── useLyricSync.ts              # 歌词同步逻辑 (~150 行)
│   ├── usePlaylistManagement.ts     # 播放列表管理 (~230 行)
│   ├── useMediaSessionAPI.ts        # Media Session API 集成 (~80 行)
│   └── useBufferManagement.ts       # 缓冲管理 (~50 行)
│
└── stores/                           # Pinia 状态管理
    ├── songs.ts                     # 主 Store - 整合所有模块 (~380 行)
    ├── volume.ts                    # 音量控制 (~70 行)
    ├── lyrics.ts                    # 歌词管理 (~100 行)
    ├── data.ts                      # 数据获取 (~90 行)
    └── songs.old.ts                 # 原始文件备份 (可删除)
```

## 🎯 模块职责划分

### 1. **Composables（可复用逻辑层）**

#### `useAudioPlayer.ts`

- **职责**: 音频元素的引用管理
- **导出**: `audioRef`, `initAudio()`, `getAudio()`
- **特点**: 最轻量，只负责音频元素的存储和获取

#### `useLyricSync.ts`

- **职责**: 歌词解析、同步和定位
- **核心功能**:
  - `parseLRC()` - 解析 LRC 格式歌词
  - `findLyricLine()` - 二分查找定位歌词行
  - `startLyricSync()` / `stopLyricSync()` - 控制歌词同步
  - `seekTo()` - 跳转到指定时间
- **优势**: 完全独立，可在其他项目中复用

#### `usePlaylistManagement.ts`

- **职责**: 播放列表和播放模式管理
- **核心功能**:
  - 播放列表 CRUD 操作
  - 播放模式切换（顺序/单曲循环/随机）
  - 随机播放顺序维护
  - 获取上一首/下一首索引
- **计算属性**:
  - `currentSongIndex` - 当前歌曲索引
  - `hasPrev` / `hasNext` - 是否有上一首/下一首
  - `playlistItems` - 当前播放列表歌曲数组

#### `useMediaSessionAPI.ts`

- **职责**: 浏览器 Media Session API 集成
- **核心功能**:
  - 设置媒体控制处理器（播放、暂停、上一首、下一首、跳转）
  - 更新媒体元数据（标题、艺术家、封面）
  - 更新播放状态和位置
- **用途**: 支持系统级媒体控制（如键盘、蓝牙耳机、通知中心）

#### `useBufferManagement.ts`

- **职责**: 音频缓冲状态监听和管理
- **核心功能**:
  - 监听缓冲进度
  - 计算缓冲百分比
  - 附加/移除缓冲事件监听器

---

### 2. **Stores（状态管理层）**

#### `volume.ts` - 音量控制 Store

- **状态**: `volume`, `muted`, `previousVolume`
- **方法**:
  - `setVolume()` - 设置音量
  - `toggleMute()` - 切换静音
  - `applyVolumeSettings()` - 应用音量设置到音频元素

#### `lyrics.ts` - 歌词管理 Store

- **状态**: `lyrics`, `lyricsLoading`, `lyricsModal`
- **方法**:
  - `showLyrics()` - 加载并显示歌词
  - `preloadLyrics()` - 预加载歌词
  - `closeLyricsModal()` - 关闭歌词弹窗
- **缓存**: LRC 缓存 Map，避免重复请求
- **集成**: 使用 `useLyricSync` composable

#### `data.ts` - 数据获取 Store

- **状态**: `songs`, `homeLoading`
- **方法**:
  - `searchSongs()` - 搜索歌曲（支持 album, artist, limit, offset）
  - `searchAlbums()` - 搜索专辑
  - `searchArtists()` - 搜索歌手
  - `fetchDefaultSongs()` - 获取默认歌曲列表

#### `songs.ts` - 主 Store（整合层）

- **职责**: 整合所有子模块，提供统一的 API
- **状态**:
  - 播放状态: `isPlaying`, `currentSong`, `currentTime`, `duration`
  - 引用其他 stores: `volumeStore`, `lyricsStore`, `dataStore`
- **核心功能**:
  - `playSong()` - 播放指定歌曲
  - `togglePlay()` - 播放/暂停切换
  - `playNextSong()` / `playPrevSong()` - 切换歌曲
  - `initAudio()` - 初始化音频元素（集成所有监听器）
- **向后兼容**: 保留所有原有的 API，确保现有组件无需修改

---

## ✅ 重构优势

### 1. **可维护性提升**

- ✅ 每个文件职责单一，易于理解
- ✅ 代码行数控制在 50-230 行，适合阅读
- ✅ 清晰的模块边界，修改影响范围小

### 2. **可测试性提升**

- ✅ Composables 完全独立，易于单元测试
- ✅ 每个 store 可单独测试
- ✅ 减少了模拟依赖的复杂度

### 3. **可复用性提升**

- ✅ Composables 可在其他项目中直接使用
- ✅ 逻辑与状态分离，灵活组合

### 4. **性能优化**

- ✅ 按需导入，Tree-shaking 更有效
- ✅ 状态更新粒度更细，减少不必要的重渲染

### 5. **团队协作**

- ✅ 不同模块可并行开发
- ✅ 代码审查更聚焦
- ✅ 减少合并冲突

---

## 🔄 向后兼容性

### API 完全兼容

所有现有组件无需修改，原有 API 保持不变：

```typescript
// 原有用法仍然有效
const songsStore = useSongsStore()

songsStore.playSong(0)
songsStore.togglePlay()
songsStore.setVolume(0.5)
songsStore.showCurrentLyrics()
// ... 所有原有方法
```

### 已验证的组件

- ✅ `SongSearch.vue`
- ✅ `PlayerBar.vue`
- ✅ `LyricViewer.vue`
- ✅ `pages/index.vue`

---

## 📊 代码统计

| 模块             | 行数   | 减少比例 |
| ---------------- | ------ | -------- |
| **原 songs.ts**  | 859    | -        |
| **新架构总计**   | ~1,165 | +35%     |
| **主 songs.ts**  | 380    | **-56%** |
| **单个模块平均** | 115    | **-87%** |

> 虽然总代码量增加了 35%，但这是合理的架构分离成本。主 store 减少了 56%，单个模块平均只有 115 行，大大提升了可维护性。

---

## 🚀 使用示例

### 使用主 Store（推荐）

```typescript
import { useSongsStore } from '@/stores/songs'

const songsStore = useSongsStore()
await songsStore.playSong(0)
songsStore.setVolume(0.8)
```

### 直接使用子 Store

```typescript
import { useVolumeStore } from '@/stores/volume'
import { useLyricsStore } from '@/stores/lyrics'

const volumeStore = useVolumeStore()
const lyricsStore = useLyricsStore()

volumeStore.setVolume(0.8, audioElement)
await lyricsStore.showLyrics('https://...')
```

### 使用 Composable（在其他项目中）

```typescript
import { useLyricSync } from '@/composables/useLyricSync'

const { parseLRC, findLyricLine, startLyricSync } = useLyricSync()
const parsed = parseLRC(lrcText)
```

---

## 🎨 设计模式

### 1. **Facade 模式**

`songs.ts` 作为统一入口，隐藏了内部模块的复杂性

### 2. **Composition 模式**

使用 Vue 3 Composition API 和 Composables 进行逻辑组合

### 3. **Single Responsibility 原则**

每个模块只负责一个明确的功能

### 4. **Dependency Injection**

通过参数传递依赖（如 `getAudio` 函数），而非直接引用

---

## 📝 后续优化建议

1. **添加单元测试**

   - 为每个 composable 添加测试
   - 为每个 store 添加测试

2. **TypeScript 类型增强**

   - 定义更精确的类型
   - 添加 JSDoc 注释

3. **性能监控**

   - 添加性能追踪
   - 监控状态更新频率

4. **文档完善**
   - API 文档
   - 使用示例
   - 最佳实践

---

## 🗑️ 清理建议

可以删除以下文件：

- `app/stores/songs.old.ts` - 原始备份文件

保留用于回滚测试，验证无误后删除。

---

## ✨ 总结

通过按功能模块拆分并将复杂逻辑抽取到 composables，我们实现了：

- ✅ **代码更清晰** - 每个文件职责明确
- ✅ **维护更简单** - 修改影响范围小
- ✅ **测试更容易** - 模块独立可测
- ✅ **复用更方便** - Composables 可跨项目使用
- ✅ **协作更高效** - 并行开发，减少冲突

同时保持了 100% 的向后兼容性，现有组件无需任何修改即可工作。
