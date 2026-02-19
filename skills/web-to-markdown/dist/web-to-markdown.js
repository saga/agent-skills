#!/usr/bin/env node
import d from "https";
import f from "http";
import l from "fs";
import h from "path";
import { fileURLToPath as w } from "url";
const S = w(import.meta.url);
h.dirname(S);
class u {
  constructor() {
    this.url = null, this.outputPath = null, this.useChrome = !1, this.chromePort = 9222;
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
      }, r = s.get(t, n, (c) => {
        if (c.statusCode >= 300 && c.statusCode < 400 && c.headers.location) {
          const i = new URL(c.headers.location, t).toString();
          console.log(`Redirecting to: ${i}`), this.fetchContent(i).then(e).catch(o);
          return;
        }
        if (c.statusCode !== 200) {
          o(new Error(`HTTP ${c.statusCode}: ${c.statusMessage}`));
          return;
        }
        let a = "";
        c.setEncoding("utf8"), c.on("data", (i) => a += i), c.on("end", () => e(a));
      });
      r.on("error", o), r.setTimeout(3e4, () => {
        r.destroy(), o(new Error("Request timeout"));
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
    const o = ((n) => {
      let r = n;
      for (; r; ) {
        if (l.existsSync(h.join(r, "package.json")))
          return r;
        const c = h.dirname(r);
        if (c === r) break;
        r = c;
      }
      return n;
    })(process.cwd()), s = h.join(o, "mcp.json");
    if (!l.existsSync(s))
      return { exists: !1, error: "mcp.json not found" };
    try {
      const r = JSON.parse(l.readFileSync(s, "utf8")).mcpServers || {};
      return r[t] ? { exists: !0, server: r[t] } : { exists: !1, availableServers: Object.keys(r) };
    } catch (n) {
      return { exists: !1, error: n.message };
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
    const r = ((i) => {
      let p = i;
      for (; p; ) {
        if (l.existsSync(h.join(p, "package.json")))
          return p;
        const m = h.dirname(p);
        if (m === p) break;
        p = m;
      }
      return i;
    })(process.cwd()), c = h.join(r, "mcp.json");
    let a = { mcpServers: {} };
    if (l.existsSync(c))
      try {
        a = JSON.parse(l.readFileSync(c, "utf8"));
      } catch (i) {
        console.log(`Warning: Could not parse existing mcp.json: ${i.message}`);
      }
    a.mcpServers = a.mcpServers || {}, a.mcpServers[t] = s;
    try {
      return l.writeFileSync(c, JSON.stringify(a, null, 2), "utf8"), {
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
      console.log("Step 2: Waiting for page load..."), await new Promise((r) => setTimeout(r, 3e3)), console.log("Step 3: Getting HTML via MCP...");
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
`).map((c) => {
      const a = c.trim();
      return a ? "> " + this.stripTags(a) : "";
    }).filter((c) => c).join(`
`) + `

`), e = e.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (o, s) => `

` + (s.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []).map((c) => {
      const a = c.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, "$1");
      return "- " + this.stripTags(a).trim();
    }).join(`
`) + `

`), e = e.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (o, s) => {
      const n = s.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      let r = 1;
      return `

` + n.map((a) => {
        const i = a.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, "$1");
        return r++ + ". " + this.stripTags(i).trim();
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
      return s.forEach((r, c) => {
        const i = (r.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).map((p) => {
          const m = p.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/i, "$1");
          return this.stripTags(m).trim();
        });
        i.length > 0 && (n += "| " + i.join(" | ") + ` |
`, c === 0 && (n += "|" + i.map(() => " --- |").join("") + `
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
      return ((h.basename(o) || "article").replace(/\.[^/.]+$/, "") || "article") + ".md";
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
        await n.goto(t, { waitUntil: "domcontentloaded", timeout: 3e4 }), await new Promise((c) => setTimeout(c, 5e3));
      } catch (c) {
        console.log(`Page load warning: ${c.message}`);
      }
      const r = await n.content();
      return console.log(`Got HTML, length: ${r.length} bytes`), await o.close(), r;
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
      const s = this.htmlToMarkdown(o), n = this.outputPath || this.generateOutputFilename(this.url), r = h.dirname(n);
      r && r !== "." && l.mkdirSync(r, { recursive: !0 }), l.writeFileSync(n, s, "utf8"), console.log(`
Success! Markdown saved to: ${n}`), console.log(`Output size: ${s.length} characters`);
    } catch (t) {
      console.error(`Error: ${t.message}`), process.exit(1);
    }
  }
}
const v = typeof process.argv[1] == "string" && import.meta.url.startsWith("file://") && (process.argv[1].endsWith("web-to-markdown.mjs") || import.meta.url.includes(process.argv[1].replace(/\\/g, "/")));
v && new u().run();
const P = {
  checkMcpServer: (g) => new u().checkMcpServer(g),
  addMcpServer: (g, t) => new u().addMcpServer(g, t),
  fetchViaMcp: (g, t) => new u().fetchViaMcp(g, t)
};
export {
  u as default,
  P as mcpHelpers
};
