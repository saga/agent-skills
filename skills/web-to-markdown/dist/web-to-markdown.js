#!/usr/bin/env node
import u from "https";
import d from "http";
import h from "fs";
import l from "path";
import { fileURLToPath as w } from "url";
const f = w(import.meta.url);
l.dirname(f);
class $ {
  constructor() {
    this.url = null, this.outputPath = null, this.useChrome = !1, this.chromePort = 9222;
  }
  /**
   * Parse command line arguments
   */
  parseArgs() {
    const e = process.argv.slice(2);
    e.length === 0 && (this.showUsage(), process.exit(1));
    for (let t = 0; t < e.length; t++)
      e[t] === "--chrome" || e[t] === "-c" ? (this.useChrome = !0, e[t + 1] && !e[t + 1].startsWith("--") && !e[t + 1].startsWith("-") && (this.chromePort = parseInt(e[t + 1], 10) || 9222, t++)) : this.url ? this.outputPath || (this.outputPath = e[t]) : this.url = e[t];
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
  async fetchContent(e) {
    return new Promise((t, o) => {
      const s = e.startsWith("https:") ? u : d, n = {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      }, i = s.get(e, n, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          const c = new URL(r.headers.location, e).toString();
          console.log(`Redirecting to: ${c}`), this.fetchContent(c).then(t).catch(o);
          return;
        }
        if (r.statusCode !== 200) {
          o(new Error(`HTTP ${r.statusCode}: ${r.statusMessage}`));
          return;
        }
        let a = "";
        r.setEncoding("utf8"), r.on("data", (c) => a += c), r.on("end", () => t(a));
      });
      i.on("error", o), i.setTimeout(3e4, () => {
        i.destroy(), o(new Error("Request timeout"));
      });
    });
  }
  /**
   * Extract main content from HTML
   */
  extractMainContent(e) {
    const t = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<div[^>]*class="[^"]*(?:main-content|article|post-content|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id="[^"]*(?:main-content|article|post-content|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    ];
    for (const s of t) {
      const n = e.match(s);
      if (n)
        return n[1];
    }
    const o = e.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return o ? o[1] : e;
  }
  /**
   * Clean HTML content
   */
  cleanHtml(e) {
    let t = e;
    return t = t.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ""), t = t.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ""), t = t.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ""), t = t.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ""), t = t.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ""), t = t.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ""), t = t.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, ""), t = t.replace(/<!--[\s\S]*?-->/g, ""), t;
  }
  /**
   * Convert HTML to Markdown
   */
  htmlToMarkdown(e) {
    const t = e.match(/<title[^>]*>(.*?)<\/title>/i), o = e.match(/<h1[^>]*>(.*?)<\/h1>/i), s = t ? this.stripTags(t[1]) : o ? this.stripTags(o[1]) : null;
    let n = this.nativeHtmlToMarkdown(e);
    return s && !n.startsWith("# ") && (n = "# " + s + `

` + n), n;
  }
  /**
   * HTML to Markdown converter
   */
  nativeHtmlToMarkdown(e) {
    let t = e;
    return t = t.replace(/<h1[^>]*>(.*?)<\/h1>/gi, `

# $1

`), t = t.replace(/<h2[^>]*>(.*?)<\/h2>/gi, `

## $1

`), t = t.replace(/<h3[^>]*>(.*?)<\/h3>/gi, `

### $1

`), t = t.replace(/<h4[^>]*>(.*?)<\/h4>/gi, `

#### $1

`), t = t.replace(/<h5[^>]*>(.*?)<\/h5>/gi, `

##### $1

`), t = t.replace(/<h6[^>]*>(.*?)<\/h6>/gi, `

###### $1

`), t = t.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, "**$2**"), t = t.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, "*$2*"), t = t.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`"), t = t.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, "\n\n```\n$1\n```\n\n"), t = t.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n\n```\n$1\n```\n\n"), t = t.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (o, s) => `

` + s.split(`
`).map((r) => {
      const a = r.trim();
      return a ? "> " + this.stripTags(a) : "";
    }).filter((r) => r).join(`
`) + `

`), t = t.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (o, s) => `

` + (s.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []).map((r) => {
      const a = r.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, "$1");
      return "- " + this.stripTags(a).trim();
    }).join(`
`) + `

`), t = t.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (o, s) => {
      const n = s.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      let i = 1;
      return `

` + n.map((a) => {
        const c = a.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, "$1");
        return i++ + ". " + this.stripTags(c).trim();
      }).join(`
`) + `

`;
    }), t = t.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)"), t = t.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, "![$2]($1)"), t = t.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, "![$1]($2)"), t = t.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, "![]($1)"), t = this.convertTables(t), t = t.replace(/<p[^>]*>(.*?)<\/p>/gi, `

$1

`), t = t.replace(/<br\s*\/?>/gi, `
`), t = t.replace(/<[^>]+>/g, ""), t = this.decodeHtmlEntities(t), t = t.replace(/\n{4,}/g, `


`), t = t.replace(/\n{3}/g, `

`), t.trim();
  }
  /**
   * Convert HTML tables to Markdown
   */
  convertTables(e) {
    return e.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (t, o) => {
      const s = o.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      if (s.length === 0) return "";
      let n = `

`;
      return s.forEach((i, r) => {
        const c = (i.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).map((p) => {
          const g = p.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/i, "$1");
          return this.stripTags(g).trim();
        });
        c.length > 0 && (n += "| " + c.join(" | ") + ` |
`, r === 0 && (n += "|" + c.map(() => " --- |").join("") + `
`));
      }), n + `
`;
    });
  }
  /**
   * Strip HTML tags from text
   */
  stripTags(e) {
    return e.replace(/<[^>]+>/g, "");
  }
  /**
   * Decode HTML entities
   */
  decodeHtmlEntities(e) {
    const t = {
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
    return e.replace(/&[a-zA-Z0-9#]+;/g, (o) => t[o] || o);
  }
  /**
   * Generate output filename from URL
   */
  generateOutputFilename(e) {
    try {
      const o = new URL(e).pathname;
      return ((l.basename(o) || "article").replace(/\.[^/.]+$/, "") || "article") + ".md";
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
  async fetchContentWithChrome(e) {
    const t = await import("puppeteer");
    let o;
    try {
      console.log(`Connecting to Chrome via Puppeteer on port ${this.chromePort}...`);
      try {
        o = await t.connect({
          browserURL: `http://localhost:${this.chromePort}`,
          defaultViewport: null
        });
      } catch {
        console.log("Could not connect to existing Chrome, launching new browser..."), o = await t.launch({
          headless: !0,
          args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });
      }
      const s = await o.pages(), n = s.length > 0 ? s[0] : await o.newPage();
      console.log(`Navigating to: ${e}`);
      try {
        await n.goto(e, { waitUntil: "domcontentloaded", timeout: 3e4 }), await new Promise((r) => setTimeout(r, 5e3));
      } catch (r) {
        console.log(`Page load warning: ${r.message}`);
      }
      const i = await n.content();
      return console.log(`Got HTML, length: ${i.length} bytes`), await o.close(), i;
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
      let e;
      this.useChrome ? e = await this.fetchContentWithChrome(this.url) : e = await this.fetchContent(this.url), console.log(`Downloaded ${e.length} bytes`), console.log("Extracting main content...");
      const t = this.extractMainContent(e);
      console.log("Cleaning HTML...");
      const o = this.cleanHtml(t);
      console.log("Converting to Markdown...");
      const s = this.htmlToMarkdown(o), n = this.outputPath || this.generateOutputFilename(this.url), i = l.dirname(n);
      i && i !== "." && h.mkdirSync(i, { recursive: !0 }), h.writeFileSync(n, s, "utf8"), console.log(`
Success! Markdown saved to: ${n}`), console.log(`Output size: ${s.length} characters`);
    } catch (e) {
      console.error(`Error: ${e.message}`), process.exit(1);
    }
  }
}
const b = import.meta.url.startsWith("file://") && (process.argv[1].endsWith("web-to-markdown.mjs") || import.meta.url.includes(process.argv[1].replace(/\\/g, "/")));
b && new $().run();
export {
  $ as default
};
