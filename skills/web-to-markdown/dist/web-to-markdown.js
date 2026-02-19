#!/usr/bin/env node
import d from "https";
import f from "http";
import l from "fs";
import p from "path";
import { fileURLToPath as w } from "url";
const S = w(import.meta.url);
p.dirname(S);
class g {
  constructor() {
    this.url = null, this.outputPath = null, this.useChrome = !1, this.chromePort = 9222;
  }
  /**
   * Find project root by searching for package.json
   */
  findProjectRoot(t) {
    let e = t;
    for (; e; ) {
      if (l.existsSync(p.join(e, "package.json")))
        return e;
      const o = p.dirname(e);
      if (o === e) break;
      e = o;
    }
    return t;
  }
  /**
   * Parse command line arguments
   */
  parseArgs() {
    const t = process.argv.slice(2);
    t.length === 0 && (this.showUsage(), process.exit(1));
    for (let e = 0; e < t.length; e++)
      t[e] === "--chrome" || t[e] === "-c" ? (this.useChrome = !0, t[e + 1] && !t[e + 1].startsWith("--") && !t[e + 1].startsWith("-") && (this.chromePort = parseInt(t[e + 1], 10) || 9222, e++)) : this.url ? this.outputPath || (this.outputPath = t[e]) : this.url = t[e];
    this.url || (this.showUsage(), process.exit(1));
  }
  /**
   * Show usage information
   */
  showUsage() {
    console.log("Usage: node web-to-markdown.mjs <URL> [output-file] [options]"), console.log(""), console.log("Arguments:"), console.log("  <URL>           The URL to fetch and convert to Markdown"), console.log("  [output-file]   Optional output file path"), console.log(""), console.log("Options:"), console.log("  --chrome, -c [port]  Use Chrome DevTools MCP for authenticated pages"), console.log("                        (default port: 9222)"), console.log("  --help, -h           Show this help message"), console.log(""), console.log("Examples:"), console.log("  node web-to-markdown.mjs https://example.com/article"), console.log("  node web-to-markdown.mjs https://example.com/article ./output.md"), console.log("  node web-to-markdown.mjs https://example.com --chrome"), console.log("  node web-to-markdown.mjs https://example.com -c 9223");
  }
  /**
   * Fetch content from URL
   */
  async fetchContent(t) {
    return new Promise((e, o) => {
      const s = t.startsWith("https:") ? d : f, n = {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      }, c = s.get(t, n, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          const a = new URL(r.headers.location, t).toString();
          console.log(`Redirecting to: ${a}`), this.fetchContent(a).then(e).catch(o);
          return;
        }
        if (r.statusCode !== 200) {
          o(new Error(`HTTP ${r.statusCode}: ${r.statusMessage}`));
          return;
        }
        let i = "";
        r.setEncoding("utf8"), r.on("data", (a) => i += a), r.on("end", () => e(i));
      });
      c.on("error", o), c.setTimeout(3e4, () => {
        c.destroy(), o(new Error("Request timeout"));
      });
    });
  }
  /**
   * Check if MCP server is available (for AI assistant with MCP access)
   * This is meant to be called via MCP tools by an AI assistant
   * 
   * @param {string} serverName - The MCP server name to check
   * @returns {Promise<{exists: boolean, server?: object}>}
   */
  async checkMcpServer(t = "chrome-devtools") {
    console.log(`Checking MCP server: ${t}`);
    const e = this.findProjectRoot(process.cwd()), o = p.join(e, "mcp.json");
    if (!l.existsSync(o))
      return { exists: !1, error: "mcp.json not found" };
    try {
      const n = JSON.parse(l.readFileSync(o, "utf8")).mcpServers || {};
      return n[t] ? { exists: !0, server: n[t] } : { exists: !1, availableServers: Object.keys(n) };
    } catch (s) {
      return { exists: !1, error: s.message };
    }
  }
  /**
   * Add MCP server configuration (for AI assistant with MCP access)
   * This is meant to be called via MCP tools by an AI assistant
   * 
   * @param {string} serverName - The MCP server name
   * @param {object} config - The server configuration
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async addMcpServer(t = "chrome-devtools", e = null) {
    const s = e || {
      command: "npx",
      args: ["-y", "chrome-devtools-mcp@latest"],
      transport: "stdio"
    };
    console.log(`Adding MCP server: ${t}`);
    const n = this.findProjectRoot(process.cwd()), c = p.join(n, "mcp.json");
    let r = { mcpServers: {} };
    if (l.existsSync(c))
      try {
        r = JSON.parse(l.readFileSync(c, "utf8"));
      } catch (i) {
        console.log(`Warning: Could not parse existing mcp.json: ${i.message}`);
      }
    r.mcpServers = r.mcpServers || {}, r.mcpServers[t] = s;
    try {
      return l.writeFileSync(c, JSON.stringify(r, null, 2), "utf8"), {
        success: !0,
        message: `Added ${t} to mcp.json. Please restart your AI assistant to load the new MCP server.`
      };
    } catch (i) {
      return { success: !1, message: `Failed to write mcp.json: ${i.message}` };
    }
  }
  /**
   * Fetch page via MCP Chrome DevTools (for AI assistant with MCP access)
   * This is meant to be called via MCP tools by an AI assistant
   * 
   * The AI assistant should call these MCP tools:
   * 1. call_mcp_tool with { tool: 'navigate', arguments: { url } }
   * 2. call_mcp_tool with { tool: 'get_html' }
   * 
   * @param {string} url - The URL to fetch
   * @param {Function} mcpCallFn - Function to call MCP tool (provided by AI assistant)
   * @returns {Promise<{success: boolean, html?: string, error?: string}>}
   */
  async fetchViaMcp(t, e = null) {
    if (console.log(`Fetching via MCP: ${t}`), !e)
      return {
        success: !1,
        error: "MCP call function not provided. This function should be called by an AI assistant with MCP access."
      };
    try {
      console.log("Step 1: Navigating to URL via MCP...");
      const o = await e("chrome-devtools", "navigate", { url: t });
      console.log("Step 2: Waiting for page load..."), await new Promise((c) => setTimeout(c, 3e3)), console.log("Step 3: Getting HTML via MCP...");
      const s = await e("chrome-devtools", "get_html"), n = s?.html || s?.content || "";
      return n ? { success: !0, html: n } : { success: !1, error: "No HTML content returned from MCP" };
    } catch (o) {
      return { success: !1, error: o.message };
    }
  }
  /**
   * Extract main content from HTML
   */
  extractMainContent(t) {
    const e = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<div[^>]*class="[^"]*(?:main-content|article|post-content|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*(?:main-content|article|post-content|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    ];
    for (const s of e) {
      const n = t.match(s);
      if (n)
        return n[1];
    }
    const o = t.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return o ? o[1] : t;
  }
  /**
   * Clean HTML content
   */
  cleanHtml(t) {
    let e = t;
    return e = e.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ""), e = e.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ""), e = e.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ""), e = e.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ""), e = e.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ""), e = e.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ""), e = e.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, ""), e = e.replace(/<!--[\s\S]*?-->/g, ""), e;
  }
  /**
   * Convert HTML to Markdown
   */
  htmlToMarkdown(t) {
    const e = t.match(/<title[^>]*>(.*?)<\/title>/i), o = t.match(/<h1[^>]*>(.*?)<\/h1>/i), s = e ? this.stripTags(e[1]) : o ? this.stripTags(o[1]) : null;
    let n = this.nativeHtmlToMarkdown(t);
    return s && !n.startsWith("# ") && (n = "# " + s + `

` + n), n;
  }
  /**
   * HTML to Markdown converter
   */
  nativeHtmlToMarkdown(t) {
    let e = t;
    return e = e.replace(/<h1[^>]*>(.*?)<\/h1>/gi, `

# $1

`), e = e.replace(/<h2[^>]*>(.*?)<\/h2>/gi, `

## $1

`), e = e.replace(/<h3[^>]*>(.*?)<\/h3>/gi, `

### $1

`), e = e.replace(/<h4[^>]*>(.*?)<\/h4>/gi, `

#### $1

`), e = e.replace(/<h5[^>]*>(.*?)<\/h5>/gi, `

##### $1

`), e = e.replace(/<h6[^>]*>(.*?)<\/h6>/gi, `

###### $1

`), e = e.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, "**$2**"), e = e.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, "*$2*"), e = e.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`"), e = e.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, "\n\n```\n$1\n```\n\n"), e = e.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n\n```\n$1\n```\n\n"), e = e.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (o, s) => `

` + s.split(`
`).map((r) => {
      const i = r.trim();
      return i ? "> " + this.stripTags(i) : "";
    }).filter((r) => r).join(`
`) + `

`), e = e.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (o, s) => `

` + (s.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []).map((r) => {
      const i = r.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, "$1");
      return "- " + this.stripTags(i).trim();
    }).join(`
`) + `

`), e = e.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (o, s) => {
      const n = s.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      let c = 1;
      return `

` + n.map((i) => {
        const a = i.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, "$1");
        return c++ + ". " + this.stripTags(a).trim();
      }).join(`
`) + `

`;
    }), e = e.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)"), e = e.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, "![$2]($1)"), e = e.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, "![$1]($2)"), e = e.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, "![]($1)"), e = this.convertTables(e), e = e.replace(/<p[^>]*>(.*?)<\/p>/gi, `

$1

`), e = e.replace(/<br\s*\/?>/gi, `
`), e = e.replace(/<[^>]+>/g, ""), e = this.decodeHtmlEntities(e), e = e.replace(/\n{4,}/g, `


`), e = e.replace(/\n{3}/g, `

`), e.trim();
  }
  /**
   * Convert HTML tables to Markdown
   */
  convertTables(t) {
    return t.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (e, o) => {
      const s = o.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      if (s.length === 0) return "";
      let n = `

`;
      return s.forEach((c, r) => {
        const a = (c.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).map((m) => {
          const u = m.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/i, "$1");
          return this.stripTags(u).trim();
        });
        a.length > 0 && (n += "| " + a.join(" | ") + ` |
`, r === 0 && (n += "|" + a.map(() => " --- |").join("") + `
`));
      }), n + `
`;
    });
  }
  /**
   * Strip HTML tags from text
   */
  stripTags(t) {
    return t.replace(/<[^>]+>/g, "");
  }
  /**
   * Decode HTML entities
   */
  decodeHtmlEntities(t) {
    const e = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
      "&nbsp;": " ",
      "&mdash;": "—",
      "&ndash;": "–",
      "&hellip;": "…",
      "&ldquo;": '"',
      "&rdquo;": '"',
      "&lsquo;": "'",
      "&rsquo;": "'"
    };
    return t.replace(/&[a-zA-Z0-9#]+;/g, (o) => e[o] || o);
  }
  /**
   * Generate output filename from URL
   */
  generateOutputFilename(t) {
    try {
      const o = new URL(t).pathname;
      return ((p.basename(o) || "article").replace(/\.[^/.]+$/, "") || "article") + ".md";
    } catch {
      return "article.md";
    }
  }
  /**
   * Run the conversion
   */
  /**
   * Fetch content using Chrome DevTools MCP (via Puppeteer)
   * This uses the existing Chrome browser session with authentication
   */
  async fetchContentWithChrome(t) {
    const e = await import("puppeteer");
    let o;
    try {
      console.log(`Connecting to Chrome via Puppeteer on port ${this.chromePort}...`);
      try {
        o = await e.connect({
          browserURL: `http://localhost:${this.chromePort}`,
          defaultViewport: null
        });
      } catch {
        console.log("Could not connect to existing Chrome, launching new browser..."), o = await e.launch({
          headless: !0,
          args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });
      }
      const s = await o.pages(), n = s.length > 0 ? s[0] : await o.newPage();
      console.log(`Navigating to: ${t}`);
      try {
        await n.goto(t, { waitUntil: "domcontentloaded", timeout: 3e4 }), await new Promise((r) => setTimeout(r, 5e3));
      } catch (r) {
        console.log(`Page load warning: ${r.message}`);
      }
      const c = await n.content();
      return console.log(`Got HTML, length: ${c.length} bytes`), await o.close(), c;
    } catch (s) {
      if (o)
        try {
          await o.close();
        } catch {
        }
      throw new Error(`Chrome fetch failed: ${s.message}`);
    }
  }
  async run() {
    try {
      this.parseArgs(), console.log(`Fetching: ${this.url}`);
      let t;
      this.useChrome ? t = await this.fetchContentWithChrome(this.url) : t = await this.fetchContent(this.url), console.log(`Downloaded ${t.length} bytes`), console.log("Extracting main content...");
      const e = this.extractMainContent(t);
      console.log("Cleaning HTML...");
      const o = this.cleanHtml(e);
      console.log("Converting to Markdown...");
      const s = this.htmlToMarkdown(o), n = this.outputPath || this.generateOutputFilename(this.url), c = p.dirname(n);
      c && c !== "." && l.mkdirSync(c, { recursive: !0 }), l.writeFileSync(n, s, "utf8"), console.log(`
Success! Markdown saved to: ${n}`), console.log(`Output size: ${s.length} characters`);
    } catch (t) {
      console.error(`Error: ${t.message}`), process.exit(1);
    }
  }
}
const v = typeof process.argv[1] == "string" && import.meta.url.startsWith("file://") && (process.argv[1].endsWith("web-to-markdown.mjs") || import.meta.url.includes(process.argv[1].replace(/\\/g, "/")));
v && new g().run();
const P = {
  checkMcpServer: (h) => new g().checkMcpServer(h),
  addMcpServer: (h, t) => new g().addMcpServer(h, t),
  fetchViaMcp: (h, t) => new g().fetchViaMcp(h, t)
};
export {
  g as default,
  P as mcpHelpers
};
