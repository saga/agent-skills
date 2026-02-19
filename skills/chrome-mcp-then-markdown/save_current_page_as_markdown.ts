import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import * as fs from "fs";
import * as path from "path";

// 这里的配置指向你本地运行的 chrome-devtools-mcp 的实例逻辑
// 注意：本示例假设你通过集成环境调用，或直接在该 Server 中实现逻辑

const server = new Server(
  {
    name: "chrome-to-markdown",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "save_active_page_to_markdown",
        description: "获取 Chrome 当前活跃标签页的内容并保存为本地 Markdown 文件",
        inputSchema: {
          type: "object",
          properties: {
            outputDir: {
              type: "string",
              description: "保存文件的目录路径 (绝对路径)",
            },
            fileName: {
              type: "string",
              description: "文件名 (不需要加 .md)",
            },
          },
          required: ["outputDir", "fileName"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "save_active_page_to_markdown") {
    throw new Error("Unknown tool");
  }

  const { outputDir, fileName } = request.params.arguments as {
    outputDir: string;
    fileName: string;
  };

  try {
    // 1. 模拟调用 chrome-devtools-mcp (这里假设环境已配置好能够访问浏览器调试端口)
    // 实际逻辑：通过远程调试协议获取 HTML
    const response = await fetch("http://127.0.0.1:9222/json");
    const tabs = await response.json();
    const activeTab = tabs.find((t: any) => t.type === "page");

    if (!activeTab) return { content: [{ type: "text", text: "未找到活跃的标签页" }] };

    // 获取 HTML (简化处理，实际生产建议使用 CDP WebSocket)
    const pageData = await fetch(`http://127.0.0.1:9222/json/evaluate/${activeTab.id}?expression=document.documentElement.outerHTML`);
    // 注：由于 CDP 交互较复杂，通常建议在 Claude Desktop 中直接串联两个 MCP
    // 这里的逻辑主要展示转换过程
    
    // 假设通过某种方式拿到了 htmlContent
    const htmlContent = "从 chrome-devtools-mcp 拿到的 HTML 字符串"; 

    // 2. 解析与转换
    const dom = new JSDOM(htmlContent);
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) throw new Error("无法解析网页内容");

    const markdown = turndownService.turndown(article.content);
    const finalContent = `# ${article.title}\n\n> Source: ${activeTab.url}\n\n---\n\n${markdown}`;

    // 3. 写入本地
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const filePath = path.join(outputDir, `${fileName}.md`);
    fs.writeFileSync(filePath, finalContent, "utf-8");

    return {
      content: [
        {
          type: "text",
          text: `成功保存！文件路径: ${filePath}`,
        },
      ],
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `失败: ${error.message}` }],
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer();
