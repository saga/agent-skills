# Skill: Chrome 内容本地化存储 (Chrome to Local Markdown)

此 Skill 允许用户通过 `chrome-devtools-mcp` 抓取当前浏览器已登录页面的内容，并自动将其清洗、转化为高质量的 Markdown 格式存入本地。

## 依赖项
1. **Chrome 浏览器**：需开启远程调试模式启动。
   - `Google Chrome --remote-debugging-port=9222`
2. **chrome-devtools-mcp**: 确保此 MCP 已在你的客户端中配置。

## 功能特性
* **绕过登录限制**：直接读取浏览器当前会话，无需输入账号密码。
* **智能正文提取**：使用 Mozilla Readability 算法，剔除广告、侧边栏和干扰信息。
* **Markdown 格式化**：自动将 HTML 标签转换为标准的 Markdown 语法。
* **本地化存储**：自定义保存路径和文件名。

## 使用场景
* **技术文档归档**：将需要登录查看的付费文档或内网 wiki 存入本地知识库。
* **网页剪藏**：配合 Obsidian 或 Logseq 使用，快速收集资料。

## 调用示例
> "帮我把当前 Chrome 页面保存到 /Users/myname/Documents/Notes 目录下，文件名叫 'MCP入门指南'"