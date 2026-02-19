---
name: "web-to-markdown"
description: "Fetches web content and converts HTML to clean Markdown format. Invoke when user wants to download a webpage as Markdown or convert HTML content to Markdown."
---

# Web to Markdown Converter

This skill fetches web content from a URL and converts it to clean, well-formatted Markdown.

## When to Use

- User wants to download a webpage as Markdown
- User needs to convert HTML content to Markdown format
- User asks to save an article or blog post as Markdown
- User wants to archive web content in Markdown format
- **User wants to access pages requiring authentication** (use Chrome mode)

## Usage

### Command Line

```bash
node web-to-markdown.mjs <URL> [output-file] [options]
```

Or run the bundled version:

```bash
node dist/web-to-markdown.js <URL> [output-file] [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--chrome`, `-c` | Use Puppeteer/Chrome to fetch the page (for authenticated pages or JS-rendered content) |
| `--chrome <port>`, `-c <port>` | Connect to existing Chrome on specified port (default: 9222) |
| `--help`, `-h` | Show help message |

### Examples

```bash
# Basic usage - direct HTTP fetch
node web-to-markdown.mjs https://example.com/article

# Specify output file
node web-to-markdown.mjs https://example.com/article ./docs/my-article.md

# Use Puppeteer/Chrome for authenticated pages or JS-rendered content
node web-to-markdown.mjs https://example.com/private-page --chrome

# Connect to existing Chrome browser (e.g., from chrome-devtools-mcp)
node web-to-markdown.mjs https://example.com -c 9222
```

## Chrome/Puppeteer Mode

For pages that require authentication, cookies, sessions, or contain JavaScript-rendered content, use the `--chrome` or `-c` flag.

This mode uses [Puppeteer](https://pptr.dev/) (the same engine used by chrome-devtools-mcp) to control a Chrome browser.

### Connecting to Existing Chrome (with your login session)

If you have Chrome already running with remote debugging:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/Library/Application Support/Google/Chrome"

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --remote-debugging-port=9222 \
  --user-data-dir="%LOCALAPPDATA%\Google\Chrome\User Data"
```

Then use:
```bash
node web-to-markdown.mjs https://example.com --chrome
```

### Using with chrome-devtools-mcp

If you're using [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp), it already starts Chrome with remote debugging. Just use the same port:

```bash
node web-to-markdown.mjs https://example.com --chrome
```

### Auto-Launch Mode

If no existing Chrome is found, the script will automatically launch a new headless Chrome browser.

## Features

- **Zero dependencies** (default mode): Built-in HTML to Markdown converter
- **Chrome/Puppeteer mode**: Uses Puppeteer for authenticated pages or JS-rendered content
- **Automatic content extraction**: Detects main content areas (article, main, content divs)
- **Clean conversion**: Removes scripts, styles, navigation, headers, footers
- **Full Markdown support**:
  - Headers (H1-H6)
  - Bold and italic text
  - Links and images
  - Ordered and unordered lists
  - Code blocks (inline and fenced)
  - Blockquotes
  - Tables
- **HTML entity decoding**: Converts &amp;, &lt;, &gt;, etc.
- **Smart whitespace handling**: Cleans up excessive newlines
- **Redirect following**: Automatically follows HTTP redirects

## Output

The script generates a `.md` file with:
- Page title as H1 header (if not already present)
- Clean Markdown formatting
- Preserved structure (headers, lists, tables, etc.)

## Error Handling

- Handles HTTP redirects (3xx responses)
- 60-second page load timeout (Chrome mode)
- 30-second request timeout (HTTP mode)
- Clear error messages for network issues
- Validates URL format
