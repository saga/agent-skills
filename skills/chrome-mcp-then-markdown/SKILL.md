---
name: "chrome-mcp-then-markdown"
description: "通过 Chrome DevTools Protocol 获取浏览器当前页面内容并转换为 Markdown 保存到本地。适用于需要登录认证的页面或用户已在浏览器中打开的页面。"
---

# Chrome Current Page to Markdown

此 Skill 通过 Chrome DevTools Protocol 获取当前浏览器页面的 HTML 内容，转换为干净的 Markdown 格式保存到本地。

## 使用场景

- 用户想把**当前浏览器已打开的页面**保存为 Markdown
- 页面需要**登录认证**（用户已在浏览器中登录）
- 页面包含**动态渲染内容**（需要 JavaScript 执行）
- 用户说"把当前页面保存到..."、"帮我剪藏这个网页..."等

## 前置条件

**Chrome 浏览器**需以远程调试模式启动：

```bash
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222
```

## AI 调用方式

当用户请求保存当前页面时，AI 应调用脚本：

```bash
node <skill-dir>/save_current_page_as_markdown.mjs <output-dir> [file-name] [options]
```

### 参数说明

| 参数 | 说明 | 必需 |
|------|------|------|
| `<output-dir>` | 保存目录（绝对路径） | 是 |
| `[file-name]` | 文件名（不需要 .md 后缀） | 否，默认自动生成 |
| `--port, -p` | Chrome DevTools 端口 | 否，默认 9222 |
| `--host` | Chrome DevTools 主机 | 否，默认 127.0.0.1 |

### 调用示例

```bash
# 保存到指定目录，自动命名
node save_current_page_as_markdown.mjs D:\Documents\Notes

# 指定文件名
node save_current_page_as_markdown.mjs D:\Documents\Notes "API文档"

# 使用非默认端口
node save_current_page_as_markdown.mjs ./output my-article -p 9223
```

## AI 工作流程

### Step 1: 确认 Chrome 已启动

检查用户是否已以远程调试模式启动 Chrome。如果没有，提示用户：

> 请先以远程调试模式启动 Chrome：
> `"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222`

### Step 2: 调用脚本

使用 `RunCommand` 工具执行脚本：

```javascript
RunCommand({
  command: `node ${skillDir}/save_current_page_as_markdown.mjs "${outputDir}" "${fileName}"`,
  blocking: true,
  requires_approval: false
})
```

### Step 3: 处理结果

脚本成功时会输出：
```
✓ Success! Saved to: D:\Documents\Notes\API文档.md
  Title: 页面标题
  Size: 12345 characters
```

如果失败，脚本会返回错误信息，AI 应根据错误提示用户：
- `No page tabs found` → Chrome 未以调试模式启动
- `WebSocket error` → 连接问题，检查端口是否正确
- `Request timeout` → 页面加载中，稍后重试

## 输出格式

生成的 Markdown 文件：

```markdown
# 页面标题

> Source: https://example.com/page-url

---

[正文内容...]
```

## 功能特性

- **智能正文提取**：自动识别 `<article>`, `<main>`, `.content` 等正文区域
- **清理干扰元素**：移除导航、侧边栏、广告、脚本、样式
- **完整 Markdown 支持**：标题、列表、代码块、表格、链接、图片
- **保留登录态**：直接读取浏览器会话，无需重新登录

## 与 web-to-markdown 的区别

| 特性 | chrome-mcp-then-markdown | web-to-markdown |
|------|--------------------------|-----------------|
| 输入 | 当前浏览器页面 | URL 地址 |
| 认证 | 使用浏览器已有登录态 | 无法处理登录页面 |
| 动态内容 | 支持（浏览器渲染） | 有限支持 |
| 调用方式 | 脚本 | 脚本 |
| 使用场景 | 已打开的页面、需登录页面 | 公开 URL、批量处理 |

## 依赖

脚本使用 Node.js 内置模块，仅 `ws`（WebSocket）为可选依赖：

```bash
npm install ws
```

如果未安装 `ws`，脚本会尝试动态导入，失败时提示安装。
