#!/usr/bin/env node
import u from "https";
import d from "http";
import h from "fs";
import l from "path";
import { fileURLToPath as f } from "url";
const $ = f(import.meta.url);
l.dirname($);
class S {
  constructor() {
    this.url = null, this.outputPath = null;
  }
  /**
   * Parse command line arguments
   */
  parseArgs() {
    const e = process.argv.slice(2);
    e.length === 0 && (this.showUsage(), process.exit(1)), this.url = e[0], this.outputPath = e[1] || null;
  }
  /**
   * Show usage information
   */
  showUsage() {
    console.log("Usage: node web-to-markdown.mjs <URL> [output-file]"), console.log(""), console.log("Example:"), console.log("  node web-to-markdown.mjs https://example.com/article"), console.log("  node web-to-markdown.mjs https://example.com/article ./output.md");
  }
  /**
   * Fetch content from URL
   */
  async fetchContent(e) {
    return new Promise((t, n) => {
      const s = e.startsWith("https:") ? u : d, r = {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      }, i = s.get(e, r, (o) => {
        if (o.statusCode >= 300 && o.statusCode < 400 && o.headers.location) {
          const c = new URL(o.headers.location, e).toString();
          console.log(`Redirecting to: ${c}`), this.fetchContent(c).then(t).catch(n);
          return;
        }
        if (o.statusCode !== 200) {
          n(new Error(`HTTP ${o.statusCode}: ${o.statusMessage}`));
          return;
        }
        let a = "";
        o.setEncoding("utf8"), o.on("data", (c) => a += c), o.on("end", () => t(a));
      });
      i.on("error", n), i.setTimeout(3e4, () => {
        i.destroy(), n(new Error("Request timeout"));
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
      const r = e.match(s);
      if (r)
        return r[1];
    }
    const n = e.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return n ? n[1] : e;
  }
  /**
   * Clean HTML content
   */
  cleanHtml(e) {
    return e.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "").replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "").replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "").replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "").replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  }
  /**
   * Convert HTML to Markdown
   */
  htmlToMarkdown(e) {
    const t = e.match(/<title[^>]*>(.*?)<\/title>/i), n = e.match(/<h1[^>]*>(.*?)<\/h1>/i), s = t ? this.stripTags(t[1]) : n ? this.stripTags(n[1]) : null, r = this.nativeHtmlToMarkdown(e);
    return s && !r.startsWith("# ") && (r = "# " + s + `

` + r), r;
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

`), t = t.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, "**$2**"), t = t.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, "*$2*"), t = t.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`"), t = t.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, "\n\n```\n$1\n```\n\n"), t = t.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n\n```\n$1\n```\n\n"), t = t.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (n, s) => `

` + s.split(`
`).map((o) => {
      const a = o.trim();
      return a ? "> " + this.stripTags(a) : "";
    }).filter((o) => o).join(`
`) + `

`), t = t.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (n, s) => `

` + (s.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []).map((o) => {
      const a = o.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, "$1");
      return "- " + this.stripTags(a).trim();
    }).join(`
`) + `

`), t = t.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (n, s) => {
      const r = s.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
      let i = 1;
      return `

` + r.map((a) => {
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
    return e.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (t, n) => {
      const s = n.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
      if (s.length === 0) return "";
      let r = `

`;
      return s.forEach((i, o) => {
        const c = (i.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).map((m) => {
          const g = m.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/i, "$1");
          return this.stripTags(g).trim();
        });
        c.length > 0 && (r += "| " + c.join(" | ") + ` |
`, o === 0 && (r += "|" + c.map(() => " --- |").join("") + `
`));
      }), r + `
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
    return e.replace(/&[a-zA-Z0-9#]+;/g, (n) => t[n] || n);
  }
  /**
   * Generate output filename from URL
   */
  generateOutputFilename(e) {
    try {
      const n = new URL(e).pathname;
      return ((l.basename(n) || "article").replace(/\.[^/.]+$/, "") || "article") + ".md";
    } catch {
      return "article.md";
    }
  }
  /**
   * Run the conversion
   */
  async run() {
    try {
      this.parseArgs(), console.log(`Fetching: ${this.url}`);
      const e = await this.fetchContent(this.url);
      console.log(`Downloaded ${e.length} bytes`), console.log("Extracting main content...");
      const t = this.extractMainContent(e);
      console.log("Cleaning HTML...");
      const n = this.cleanHtml(t);
      console.log("Converting to Markdown...");
      const s = this.htmlToMarkdown(n), r = this.outputPath || this.generateOutputFilename(this.url), i = l.dirname(r);
      i && i !== "." && h.mkdirSync(i, { recursive: !0 }), h.writeFileSync(r, s, "utf8"), console.log(`
Success! Markdown saved to: ${r}`), console.log(`Output size: ${s.length} characters`);
    } catch (e) {
      console.error(`Error: ${e.message}`), process.exit(1);
    }
  }
}
const w = import.meta.url.startsWith("file://") && (process.argv[1].endsWith("web-to-markdown.mjs") || import.meta.url.includes(process.argv[1].replace(/\\/g, "/")));
w && new S().run();
export {
  S as default
};
