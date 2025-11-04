# UMarquee 组件优化说明

## 优化时间

2025-11-04

## 优化目标

根据 Nuxt UI 官方文档重新完善首页的专辑与歌手展示,使用正确的 `UMarquee` 组件 API。

## 参考文档

- [Nuxt UI Marquee 组件文档](https://ui.nuxt.com/docs/components/marquee)

## 主要变更

### 1. 修复错误的 Props 使用

#### 之前的错误实现

```vue
<UMarquee :items="artists" :duration="30">
  <template #default="{ item }">
    <UCard v-if="item && item.artist">
      <!-- 卡片内容 -->
    </UCard>
  </template>
</UMarquee>
```

**问题:**

- `UMarquee` 组件没有 `items` prop
- `UMarquee` 组件没有 `duration` prop
- 不需要使用 `#default` 插槽模板

#### 修复后的正确实现

```vue
<UMarquee
  pause-on-hover
  :repeat="4"
  :ui="{ root: '[--duration:30s] [--gap:--spacing(3)]', content: 'w-auto' }"
>
  <UCard
    v-for="item in artists"
    :key="item.artist"
    class="shrink-0"
  >
    <!-- 卡片内容 -->
  </UCard>
</UMarquee>
```

### 2. 添加的关键特性

#### 2.1 Pause on Hover (悬停暂停)

```vue
<UMarquee pause-on-hover>
```

- 当鼠标悬停在轮播内容上时,动画会暂停
- 提升用户体验,方便用户查看和点击

#### 2.2 Reverse (反向滚动)

```vue
<UMarquee reverse>  <!-- 专辑使用反向滚动 -->
```

- 专辑轮播使用反向滚动,与歌手轮播形成对比
- 视觉效果更丰富

#### 2.3 Repeat (重复次数)

```vue
<UMarquee :repeat="4">
```

- 控制内容重复次数,确保无缝循环
- 默认值是 4,适合大多数场景

#### 2.4 自定义动画时长和间距

```vue
<UMarquee
  :ui="{
    root: '[--duration:30s] [--gap:--spacing(3)]',
    content: 'w-auto'
  }"
>
```

- 使用 CSS 变量 `--duration` 控制动画时长
  - 歌手轮播: 30 秒
  - 专辑轮播: 35 秒
- 使用 `--gap` 控制项目间距 (spacing(3))
- `w-auto` 确保内容宽度自适应

### 3. 样式优化

#### 3.1 使用 `shrink-0` 类

```vue
<UCard class="shrink-0">
```

- 确保卡片不会被压缩
- 保持一致的卡片尺寸

#### 3.2 移除冗余的 `mx-2`

- 之前使用 `mx-2` 手动添加间距
- 现在使用 `:ui` prop 的 `--gap` 统一控制

#### 3.3 保留过渡效果

```vue
<UCard class="transition hover:scale-105">
```

- 保留鼠标悬停时的缩放效果
- 提升交互体验

### 4. 数据流优化

#### 直接遍历数据

```vue
<UCard
  v-for="item in artists"
  :key="item.artist"
>
```

- 不再需要 `v-if="item && item.artist"` 检查
- 代码更简洁,性能更好
- 数据在 store 层已经过滤和验证

## UMarquee 组件 API 总结

### Props

| Prop             | 类型                         | 默认值         | 说明           |
| ---------------- | ---------------------------- | -------------- | -------------- |
| `pause-on-hover` | `boolean`                    | `false`        | 悬停时暂停动画 |
| `reverse`        | `boolean`                    | `false`        | 反向滚动       |
| `orientation`    | `'horizontal' \| 'vertical'` | `'horizontal'` | 滚动方向       |
| `repeat`         | `number`                     | `4`            | 内容重复次数   |
| `overlay`        | `boolean`                    | `true`         | 显示渐变遮罩   |
| `ui`             | `object`                     | -              | 自定义样式     |

### UI 自定义选项

```typescript
ui: {
  root?: string    // 根容器样式
  content?: string // 内容容器样式
}
```

### 常用 CSS 变量

- `--duration`: 动画持续时间 (例如: `30s`)
- `--gap`: 项目间距 (例如: `--spacing(3)`)

## 性能优化

### 1. 减少 DOM 操作

- 移除不必要的 `v-if` 检查
- 直接使用 `v-for` 遍历

### 2. 优化动画性能

- 使用 CSS `transform` 而非 `margin/padding`
- 利用 `backface-hidden` 提升性能

### 3. 懒加载图片

```vue
<NuxtImg loading="lazy" />
```

- 保留图片懒加载
- 减少首屏加载时间

## 用户体验提升

1. **悬停暂停**: 用户可以轻松点击感兴趣的内容
2. **双向滚动**: 歌手和专辑不同方向滚动,视觉更丰富
3. **流畅动画**: 30-35 秒的动画时长,不会太快或太慢
4. **一致间距**: 使用统一的间距系统,视觉更协调

## 测试建议

1. **浏览器兼容性**:

   - Chrome/Edge (最新版)
   - Firefox (最新版)
   - Safari (最新版)

2. **响应式测试**:

   - 桌面端 (1920x1080)
   - 平板端 (768x1024)
   - 移动端 (375x667)

3. **性能测试**:
   - 检查动画是否流畅 (60fps)
   - 检查内存占用是否正常
   - 检查 CPU 使用率

## 后续优化方向

1. **垂直轮播**:

   ```vue
   <UMarquee orientation="vertical">
   ```

   - 可考虑在侧边栏使用垂直轮播

2. **移除渐变遮罩**:

   ```vue
   <UMarquee :overlay="false">
   ```

   - 根据设计需求决定是否需要边缘渐变

3. **响应式速度**:
   - 可以根据屏幕尺寸动态调整 `--duration`
   - 移动端可以使用更快的速度

## 相关文件

- `app/pages/index.vue` - 首页组件
- `app/stores/data.ts` - 数据获取逻辑
- `app/stores/songs.ts` - 歌曲状态管理

## 官方示例参考

参考 Nuxt UI 官方的 Testimonials 示例:

```vue
<UMarquee
  pause-on-hover
  :overlay="false"
  :ui="{ root: '[--gap:--spacing(4)]', content: 'w-auto py-1' }"
>
  <UPageCard
    v-for="(testimonial, index) in testimonials"
    :key="index"
    class="w-64 shrink-0"
  >
    <!-- 内容 -->
  </UPageCard>
</UMarquee>
```

## 总结

本次优化完全遵循 Nuxt UI 官方文档的最佳实践,修复了错误的 API 使用,添加了增强用户体验的特性,并优化了性能。代码更简洁、更易维护,用户体验也得到了显著提升。
