#!/usr/bin/env node

/**
 * Chrome Current Page to Markdown
 * 
 * 通过 Chrome DevTools Protocol 获取当前浏览器页面内容，
 * 转换为 Markdown 并保存到本地。
 * 
 * 使用前提：Chrome 需以远程调试模式启动
 *   --remote-debugging-port=9222
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = 9222;
const DEFAULT_HOST = '127.0.0.1';

class ChromePageToMarkdown {
    constructor() {
        this.port = DEFAULT_PORT;
        this.host = DEFAULT_HOST;
        this.outputDir = null;
        this.fileName = null;
    }

    parseArgs() {
        const args = process.argv.slice(2);
        
        if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
            this.showUsage();
            process.exit(args.length === 0 ? 1 : 0);
        }

        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--port' || args[i] === '-p') {
                this.port = parseInt(args[i + 1], 10) || DEFAULT_PORT;
                i++;
            } else if (args[i] === '--host') {
                this.host = args[i + 1] || DEFAULT_HOST;
                i++;
            } else if (!this.outputDir) {
                this.outputDir = args[i];
            } else if (!this.fileName) {
                this.fileName = args[i];
            }
        }

        if (!this.outputDir) {
            console.error('Error: output directory is required');
            this.showUsage();
            process.exit(1);
        }

        if (!this.fileName) {
            this.fileName = this.generateFileName();
        }
    }

    showUsage() {
        console.log('Usage: node save_current_page_as_markdown.mjs <output-dir> [file-name] [options]');
        console.log('');
        console.log('Arguments:');
        console.log('  <output-dir>    Directory to save the markdown file');
        console.log('  [file-name]     Output file name (without .md extension)');
        console.log('');
        console.log('Options:');
        console.log('  --port, -p <port>   Chrome DevTools port (default: 9222)');
        console.log('  --host <host>       Chrome DevTools host (default: 127.0.0.1)');
        console.log('  --help, -h          Show this help message');
        console.log('');
        console.log('Prerequisites:');
        console.log('  Chrome must be started with --remote-debugging-port=9222');
        console.log('');
        console.log('Examples:');
        console.log('  node save_current_page_as_markdown.mjs ./notes "My Article"');
        console.log('  node save_current_page_as_markdown.mjs D:\\docs api-doc -p 9223');
    }

    async fetchJson(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https:') ? https : http;
            
            const request = client.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }

                let data = '';
                response.setEncoding('utf8');
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });

            request.on('error', reject);
            request.setTimeout(10000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    async getActiveTab() {
        const tabsUrl = `http://${this.host}:${this.port}/json`;
        console.log(`Fetching tabs from: ${tabsUrl}`);
        
        const tabs = await this.fetchJson(tabsUrl);
        const pageTabs = tabs.filter((t) => t.type === 'page');
        
        if (pageTabs.length === 0) {
            throw new Error('No page tabs found. Make sure Chrome is running with --remote-debugging-port=9222');
        }

        const activeTab = pageTabs[0];
        console.log(`Found tab: ${activeTab.title}`);
        console.log(`URL: ${activeTab.url}`);
        
        return activeTab;
    }

    async getHtmlViaWebSocket(wsUrl) {
        return new Promise((resolve, reject) => {
            import('ws').then(({ default: WebSocket }) => {
                const ws = new WebSocket(wsUrl);
                let resolved = false;

                ws.on('open', () => {
                    ws.send(JSON.stringify({
                        id: 1,
                        method: 'DOM.getDocument',
                        params: { depth: -1 }
                    }));
                });

                ws.on('message', (data) => {
                    const response = JSON.parse(data.toString());
                    
                    if (response.id === 1) {
                        ws.send(JSON.stringify({
                            id: 2,
                            method: 'DOM.getOuterHTML',
                            params: { nodeId: response.result.root.nodeId }
                        }));
                    } else if (response.id === 2) {
                        resolved = true;
                        ws.close();
                        resolve(response.result.outerHTML);
                    }
                });

                ws.on('error', (error) => {
                    if (!resolved) {
                        reject(new Error(`WebSocket error: ${error.message}`));
                    }
                });

                ws.on('close', () => {
                    if (!resolved) {
                        reject(new Error('WebSocket closed unexpectedly'));
                    }
                });

                setTimeout(() => {
                    if (!resolved) {
                        ws.close();
                        reject(new Error('WebSocket timeout'));
                    }
                }, 30000);
            }).catch(reject);
        });
    }

    async getHtmlSimple(tab) {
        const url = `http://${this.host}:${this.port}/json`;
        const pages = await this.fetchJson(url);
        const page = pages.find((p) => p.id === tab.id);
        
        if (!page || !page.webSocketDebuggerUrl) {
            throw new Error('Could not find WebSocket URL for tab');
        }

        return this.getHtmlViaWebSocket(page.webSocketDebuggerUrl);
    }

    extractTitle(html) {
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        if (titleMatch) {
            return this.stripTags(titleMatch[1]).trim();
        }

        const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (h1Match) {
            return this.stripTags(h1Match[1]).trim();
        }

        return 'Untitled';
    }

    extractMainContent(html) {
        const patterns = [
            /<article[^>]*>([\s\S]*?)<\/article>/i,
            /<main[^>]*>([\s\S]*?)<\/main>/i,
            /<div[^>]*class="[^"]*(?:main-content|article-content|post-content|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<div[^>]*id="[^"]*(?:main-content|article-content|post-content|entry-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
            /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1].length > 500) {
                return match[1];
            }
        }

        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            return bodyMatch[1];
        }

        return html;
    }

    cleanHtml(html) {
        let result = html;
        
        result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        result = result.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
        result = result.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
        result = result.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
        result = result.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
        result = result.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
        result = result.replace(/<!--[\s\S]*?-->/g, '');
        result = result.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
        
        return result;
    }

    htmlToMarkdown(html, title, sourceUrl) {
        let md = this.nativeHtmlToMarkdown(html);

        md = `# ${title}\n\n> Source: ${sourceUrl}\n\n---\n\n${md}`;

        return md;
    }

    nativeHtmlToMarkdown(html) {
        let md = html;

        md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n');
        md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n');
        md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n');
        md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n\n#### $1\n\n');
        md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n\n##### $1\n\n');
        md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n\n###### $1\n\n');

        md = md.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
        md = md.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*');
        md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

        md = md.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, '\n\n```\n$1\n```\n\n');
        md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n\n```\n$1\n```\n\n');

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

        md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
            const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
            const listItems = items.map(item => {
                const text = item.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, '$1');
                return '- ' + this.stripTags(text).trim();
            }).join('\n');
            return '\n\n' + listItems + '\n\n';
        });

        md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
            const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
            let counter = 1;
            const listItems = items.map(item => {
                const text = item.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, '$1');
                return (counter++) + '. ' + this.stripTags(text).trim();
            }).join('\n');
            return '\n\n' + listItems + '\n\n';
        });

        md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

        md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
        md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)');
        md = md.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');

        md = this.convertTables(md);

        md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n');
        md = md.replace(/<br\s*\/?>/gi, '\n');
        md = md.replace(/<[^>]+>/g, '');
        md = this.decodeHtmlEntities(md);

        md = md.replace(/\n{4,}/g, '\n\n\n');
        md = md.replace(/\n{3}/g, '\n\n');

        return md.trim();
    }

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
                    
                    if (rowIndex === 0) {
                        md += '|' + cellContents.map(() => ' --- |').join('') + '\n';
                    }
                }
            });

            return md + '\n';
        });
    }

    stripTags(html) {
        return html.replace(/<[^>]+>/g, '');
    }

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
            '&lsquo;': "'",
            '&rsquo;': "'"
        };

        return text.replace(/&[a-zA-Z0-9#]+;/g, entity => {
            return entities[entity] || entity;
        });
    }

    generateFileName() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        return `page-${timestamp}`;
    }

    async run() {
        try {
            this.parseArgs();

            console.log('Connecting to Chrome DevTools...');
            
            const tab = await this.getActiveTab();
            
            console.log('Fetching page HTML...');
            const html = await this.getHtmlSimple(tab);
            console.log(`Got HTML: ${html.length} bytes`);

            console.log('Extracting content...');
            const title = this.extractTitle(html);
            const mainContent = this.extractMainContent(html);

            console.log('Converting to Markdown...');
            const cleanedHtml = this.cleanHtml(mainContent);
            const markdown = this.htmlToMarkdown(cleanedHtml, title, tab.url);

            if (!fs.existsSync(this.outputDir)) {
                fs.mkdirSync(this.outputDir, { recursive: true });
            }

            const filePath = path.join(this.outputDir, `${this.fileName}.md`);
            fs.writeFileSync(filePath, markdown, 'utf8');

            console.log(`\n✓ Success! Saved to: ${filePath}`);
            console.log(`  Title: ${title}`);
            console.log(`  Size: ${markdown.length} characters`);

            return { success: true, filePath, title, size: markdown.length };

        } catch (error) {
            console.error(`\n✗ Error: ${error.message}`);
            process.exit(1);
        }
    }
}

const isMainModule = typeof process.argv[1] === 'string' && 
    import.meta.url.startsWith('file://') && 
    import.meta.url.includes(process.argv[1].replace(/\\/g, '/'));

if (isMainModule) {
    const converter = new ChromePageToMarkdown();
    converter.run();
}

export default ChromePageToMarkdown;
