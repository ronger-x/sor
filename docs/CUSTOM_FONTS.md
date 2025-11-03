# 自定义字体使用指南

本项目已配置 EDIX 自定义字体用于 Logo 显示。

## 📁 文件结构

```
public/
  └── fonts/
      └── EDIX.ttf        # 自定义字体文件

app/
  └── assets/
      └── css/
          └── main.css    # 字体定义和主题配置
```

## 🎨 字体配置

### 1. 字体文件位置

字体文件存放在 `public/fonts/EDIX.ttf`，通过 `/fonts/EDIX.ttf` 路径访问。

### 2. 字体定义 (main.css)

```css
@font-face {
  font-family: 'EDIX';
  src: url('/fonts/EDIX.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap; /* 优化字体加载性能 */
}
```

### 3. Tailwind CSS 配置

在 `@theme static` 中定义了 CSS 变量：

```css
@theme static {
  --font-edix: 'EDIX', sans-serif;
}
```

## 🚀 使用方法

### 方法 1: 使用 Tailwind 类名（推荐）

```vue
<span class="font-edix">S.O.R Music</span>
```

### 方法 2: 直接使用 CSS

```vue
<style scoped>
.logo {
  font-family: 'EDIX', sans-serif;
}
</style>
```

### 方法 3: 使用 CSS 变量

```vue
<style scoped>
.logo {
  font-family: var(--font-edix);
}
</style>
```

## 📝 当前应用位置

Logo 字体已应用于：

- `app/layouts/default.vue` - 头部 Logo

```vue
<span class="text-xl font-bold tracking-wide text-primary font-edix">
  S.O.R Music
</span>
```

## ➕ 添加更多字体

如需添加更多自定义字体：

1. 将字体文件放入 `public/fonts/` 目录
2. 在 `app/assets/css/main.css` 中添加 `@font-face` 定义
3. 在 `@theme static` 中添加 CSS 变量（可选）
4. 使用对应的类名或 CSS

### 示例：添加另一个字体

```css
/* main.css */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/CustomFont.woff2') format('woff2'), url('/fonts/CustomFont.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@theme static {
  --font-custom: 'CustomFont', sans-serif;
}
```

## 🎯 最佳实践

1. **字体格式**：优先使用 WOFF2 格式（更小、更快），fallback 到 TTF
2. **font-display: swap**：避免字体加载时的文本闪烁
3. **预加载关键字体**：在 `nuxt.config.ts` 中添加预加载
   ```typescript
   app: {
     head: {
       link: [
         {
           rel: 'preload',
           href: '/fonts/EDIX.ttf',
           as: 'font',
           type: 'font/ttf',
           crossorigin: 'anonymous'
         }
       ]
     }
   }
   ```

## 🔧 优化建议

### 1. 转换为 WOFF2 格式（可选）

WOFF2 格式比 TTF 小 30-50%，建议转换：

使用在线工具或命令行工具：

```bash
# 使用 fonttools (需要 Python)
pip install fonttools brotli
pyftsubset EDIX.ttf --output-file=EDIX.woff2 --flavor=woff2
```

### 2. 字体子集化（可选）

如果只使用特定字符，可以创建子集以减小文件大小：

```bash
pyftsubset EDIX.ttf \
  --output-file=EDIX-subset.woff2 \
  --flavor=woff2 \
  --unicodes="U+0020-007E"  # 仅包含基本 ASCII
```

### 3. 添加字体预加载

在 `app.vue` 中添加：

```vue
<script setup>
useHead({
  link: [
    {
      rel: 'preload',
      href: '/fonts/EDIX.ttf',
      as: 'font',
      type: 'font/ttf',
      crossorigin: 'anonymous'
    }
  ]
})
</script>
```

## 📊 性能影响

- ✅ 使用 `font-display: swap` 避免 FOIT (Flash of Invisible Text)
- ✅ 字体文件托管在同域名，减少 DNS 查询
- ℹ️ 建议转换为 WOFF2 以减小文件大小
- ℹ️ 考虑使用 CDN 加速字体加载

## 🐛 故障排查

### 字体未显示？

1. 检查浏览器开发工具 Network 标签，确认字体文件加载成功
2. 确认字体文件路径正确（`/fonts/EDIX.ttf`）
3. 检查浏览器控制台是否有 CORS 错误
4. 清除浏览器缓存重试

### 字体加载慢？

1. 考虑转换为 WOFF2 格式
2. 添加字体预加载
3. 使用 CDN 托管字体文件
4. 考虑字体子集化

---

**配置日期**: 2025-11-03  
**字体文件**: EDIX.ttf
