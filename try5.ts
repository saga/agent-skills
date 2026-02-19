import * as fs from "fs/promises";
import * as path from "path";

async function fetchAndConvertToMarkdown() {
    const url = "https://freedium-mirror.cfd/https://itnext.io/beyond-pros-and-cons-a-multi-dimensional-trade-off-analysis-framework-for-software-architects-f61cd81e5cdf";
    
    console.log(`正在获取: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP 错误：${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // 简单的 HTML 转 Markdown 转换
    let markdown = html;
    
    // 移除 script 和 style 标签
    markdown = markdown.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    markdown = markdown.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    
    // 标题转换
    markdown = markdown.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n");
    markdown = markdown.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n");
    markdown = markdown.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n");
    markdown = markdown.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "#### $1\n");
    
    // 段落转换
    markdown = markdown.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n");
    
    // 列表转换
    markdown = markdown.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
    markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "$1\n");
    markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "$1\n");
    
    // 粗体和斜体
    markdown = markdown.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
    markdown = markdown.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
    markdown = markdown.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
    markdown = markdown.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
    
    // 链接转换
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
    
    // 代码块转换
    markdown = markdown.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "```\n$1\n```\n");
    markdown = markdown.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
    
    // 换行
    markdown = markdown.replace(/<br[^>]*>/gi, "\n");
    
    // 移除剩余的 HTML 标签
    markdown = markdown.replace(/<[^>]+>/g, "");
    
    // 解码 HTML 实体
    markdown = markdown.replace(/&nbsp;/g, " ");
    markdown = markdown.replace(/&amp;/g, "&");
    markdown = markdown.replace(/&lt;/g, "<");
    markdown = markdown.replace(/&gt;/g, ">");
    markdown = markdown.replace(/&quot;/g, "\"");
    markdown = markdown.replace(/&#39;/g, "'");
    
    // 清理多余的空行
    markdown = markdown.replace(/\n\s*\n\s*\n/g, "\n\n");
    markdown = markdown.trim();
    
    // 保存到 temp 目录
    const outputPath = path.join(process.cwd(), "temp", "article.md");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, markdown, "utf-8");
    
    console.log(`\n✅ 已保存到：${outputPath}`);
    console.log(`\n--- Markdown 内容预览 (前 2000 字符) ---\n`);
    console.log(markdown.slice(0, 2000));
    if (markdown.length > 2000) {
        console.log(`\n... (共 ${markdown.length} 字符，完整内容请查看保存的文件)`);
    }
}

fetchAndConvertToMarkdown().catch((error) => {
    console.error("错误:", error);
    process.exit(1);
});
