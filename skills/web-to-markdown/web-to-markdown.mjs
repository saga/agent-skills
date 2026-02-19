#!/usr/bin/env node

/**
 * Web to Markdown Converter
 * Fetches web content and converts it to clean Markdown format
 * 
 * Priority:
 * 1. Use turndown package if available (npm install turndown)
 * 2. Fallback to native HTML-to-Markdown converter
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to import turndown, fallback to null if not available
let TurndownService = null;
try {
    const turndownModule = await import('turndown');
    TurndownService = turndownModule.default;
    console.log('Using turndown package for HTML to Markdown conversion');
} catch {
    console.log('turndown package not found, using native converter');
    console.log('Tip: Run "npm install turndown" for better conversion quality');
}

class WebToMarkdown {
    constructor() {
        this.url = null;
        this.outputPath = null;
        this.turndownService = null;
        
        // Initialize turndown if available
        if (TurndownService) {
            this.turndownService = new TurndownService({
                headingStyle: 'atx',
                hr: '---',
                bulletListMarker: '-',
                codeBlockStyle: 'fenced',
                fence: '```',
                emDelimiter: '*',
                strongDelimiter: '**',
                linkStyle: 'inlined'
            });
        }
    }

    /**
     * Parse command line arguments
     */
    parseArgs() {
        const args = process.argv.slice(2);
        
        if (args.length === 0) {
            this.showUsage();
            process.exit(1);
        }

        this.url = args[0];
        this.outputPath = args[1] || null;
    }

    /**
     * Show usage information
     */
    showUsage() {
        console.log('Usage: node web-to-markdown.mjs <URL> [output-file]');
        console.log('');
        console.log('Example:');
        console.log('  node web-to-markdown.mjs https://example.com/article');
        console.log('  node web-to-markdown.mjs https://example.com/article ./output.md');
        console.log('');
        console.log('Note: Install turndown for better conversion quality:');
        console.log('  npm install turndown');
    }

    /**
     * Fetch content from URL
     */
    async fetchContent(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https:') ? https : http;
            
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };

            const request = client.get(url, options, (response) => {
                // Handle redirects
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    const redirectUrl = new URL(response.headers.location, url).toString();
                    console.log(`Redirecting to: ${redirectUrl}`);
                    this.fetchContent(redirectUrl).then(resolve).catch(reject);
                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }

                let data = '';
                response.setEncoding('utf8');
                response.on('data', chunk => data += chunk);
                response.on('end', () => resolve(data));
            });

            request.on('error', reject);
            request.setTimeout(30000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    /**
     * Extract main content from HTML
     */
    extractMainContent(html) {
        // Try to find main content area
        const patterns = [
            /<article[^>]*>([\s\S]*?)<\/article>/i,
            /<main[^>]*>([\s\S]*?)<\/main>/i,
            /<div[^>]*class="[^"]*(?:main-content|article|post-content|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<div[^>]*id="[^"]*(?:main-content|article|post-content|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                return match[1];
            }
        }

        // Fallback: extract body content
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            return bodyMatch[1];
        }

        return html;
    }

    /**
     * Clean HTML content
     */
    cleanHtml(html) {
        return html
            // Remove script tags
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            // Remove style tags
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            // Remove noscript tags
            .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
            // Remove nav elements
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            // Remove header elements (except h1-h6)
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
            // Remove footer elements
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
            // Remove aside elements
            .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
            // Remove comments
            .replace(/<!--[\s\S]*?-->/g, '');
    }

    /**
     * Convert HTML to Markdown using turndown if available, otherwise use native converter
     */
    htmlToMarkdown(html) {
        // Extract title before conversion
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
        const title = titleMatch ? this.stripTags(titleMatch[1]) : 
                     (h1Match ? this.stripTags(h1Match[1]) : null);

        let md;
        
        if (this.turndownService) {
            // Use turndown for conversion
            md = this.turndownService.turndown(html);
        } else {
            // Use native converter
            md = this.nativeHtmlToMarkdown(html);
        }

        // Add title as header if not already present and title exists
        if (title && !md.startsWith('# ')) {
            md = '# ' + title + '\n\n' + md;
        }

        return md;
    }

    /**
     * Native HTML to Markdown converter (fallback when turndown is not available)
     */
    nativeHtmlToMarkdown(html) {
        let md = html;

        // Convert h1-h6 headers
        md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n');
        md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n');
        md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n');
        md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n\n#### $1\n\n');
        md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n\n##### $1\n\n');
        md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n\n###### $1\n\n');

        // Convert strong/b tags
        md = md.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');

        // Convert em/i tags
        md = md.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*');

        // Convert code tags
        md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

        // Convert pre/code blocks
        md = md.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, '\n\n```\n$1\n```\n\n');
        md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n\n```\n$1\n```\n\n');

        // Convert blockquotes
        md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
            const lines = content.split('\n');
            const quoted = lines.map(line => {
                const stripped = line.trim();
                if (stripped) {
                    return '> ' + this.stripTags(stripped);
                }
                return '';
            }).filter(line => line).join('\n');
            return '\n\n' + quoted + '\n\n';
        });

        // Convert unordered lists
        md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
            const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
            const listItems = items.map(item => {
                const text = item.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, '$1');
                return '- ' + this.stripTags(text).trim();
            }).join('\n');
            return '\n\n' + listItems + '\n\n';
        });

        // Convert ordered lists
        md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
            const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
            let counter = 1;
            const listItems = items.map(item => {
                const text = item.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, '$1');
                return (counter++) + '. ' + this.stripTags(text).trim();
            }).join('\n');
            return '\n\n' + listItems + '\n\n';
        });

        // Convert links
        md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

        // Convert images
        md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
        md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)');
        md = md.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');

        // Convert tables
        md = this.convertTables(md);

        // Convert paragraphs
        md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n');

        // Convert line breaks
        md = md.replace(/<br\s*\/?>/gi, '\n');

        // Remove remaining HTML tags
        md = md.replace(/<[^>]+>/g, '');

        // Decode HTML entities
        md = this.decodeHtmlEntities(md);

        // Clean up excessive whitespace
        md = md.replace(/\n{4,}/g, '\n\n\n');
        md = md.replace(/\n{3}/g, '\n\n');

        return md.trim();
    }

    /**
     * Convert HTML tables to Markdown
     */
    convertTables(html) {
        return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, content) => {
            const rows = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
            if (rows.length === 0) return '';

            let md = '\n\n';
            
            rows.forEach((row, rowIndex) => {
                const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
                const cellContents = cells.map(cell => {
                    const text = cell.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/i, '$1');
                    return this.stripTags(text).trim();
                });

                if (cellContents.length > 0) {
                    md += '| ' + cellContents.join(' | ') + ' |\n';
                    
                    // Add separator after header row
                    if (rowIndex === 0) {
                        md += '|' + cellContents.map(() => ' --- |').join('') + '\n';
                    }
                }
            });

            return md + '\n';
        });
    }

    /**
     * Strip HTML tags from text
     */
    stripTags(html) {
        return html.replace(/<[^>]+>/g, '');
    }

    /**
     * Decode HTML entities
     */
    decodeHtmlEntities(text) {
        const entities = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&nbsp;': ' ',
            '&mdash;': '—',
            '&ndash;': '–',
            '&hellip;': '…',
            '&ldquo;': '"',
            '&rdquo;': '"',
            '&lsquo;': '\'',
            '&rsquo;': '\''
        };

        return text.replace(/&[a-zA-Z0-9#]+;/g, entity => {
            return entities[entity] || entity;
        });
    }

    /**
     * Generate output filename from URL
     */
    generateOutputFilename(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const basename = path.basename(pathname) || 'article';
            // Remove extension and add .md
            const name = basename.replace(/\.[^/.]+$/, '') || 'article';
            return name + '.md';
        } catch {
            return 'article.md';
        }
    }

    /**
     * Run the conversion
     */
    async run() {
        try {
            this.parseArgs();
            
            console.log(`Fetching: ${this.url}`);
            const html = await this.fetchContent(this.url);
            console.log(`Downloaded ${html.length} bytes`);

            console.log('Extracting main content...');
            const mainContent = this.extractMainContent(html);

            console.log('Cleaning HTML...');
            const cleanedHtml = this.cleanHtml(mainContent);

            console.log('Converting to Markdown...');
            const markdown = this.htmlToMarkdown(cleanedHtml);

            // Determine output path
            const outputPath = this.outputPath || this.generateOutputFilename(this.url);
            
            // Ensure directory exists
            const outputDir = path.dirname(outputPath);
            if (outputDir && outputDir !== '.') {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Write output
            fs.writeFileSync(outputPath, markdown, 'utf8');
            
            console.log(`\nSuccess! Markdown saved to: ${outputPath}`);
            console.log(`Output size: ${markdown.length} characters`);

        } catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    }
}

// Run if called directly
const isMainModule = import.meta.url.startsWith('file://') && 
    (process.argv[1].endsWith('web-to-markdown.mjs') || 
     import.meta.url.includes(process.argv[1].replace(/\\/g, '/')));

if (isMainModule) {
    const converter = new WebToMarkdown();
    converter.run();
}

export default WebToMarkdown;
