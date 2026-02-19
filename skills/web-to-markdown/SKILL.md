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
- **User wants to access pages requiring authentication** (use Chrome/MCP mode)

## Usage

### For AI Assistant with MCP Access

When using this skill via an AI assistant that has MCP access (like Claude Code, Cursor, Cline), the AI should:

**Step 1: Check MCP servers**
```javascript
// Call list_mcp_servers to check if chrome-devtools is available
```

**Step 2: Auto-install if missing**
```javascript
// If mcp-chrome-devtools not found, call add_mcp_server:
{
  "name": "chrome-devtools",
  "command": "npx",
  "args": ["-y", "chrome-devtools-mcp@latest"],
  "transport": "stdio"
}
```

**Step 3: Fetch page via MCP**
```javascript
// Call call_mcp_tool to navigate:
{
  "server": "chrome-devtools",
  "tool": "navigate",
  "arguments": { "url": "<URL>" }
}

// Wait for page load

// Get HTML:
{
  "server": "chrome-devtools",
  "tool": "get_html"
}
```

**Step 4: Convert to Markdown**
- Use this skill's `htmlToMarkdown()` function to convert the fetched HTML
- Or pass the HTML to the conversion functions

### Command Line (Standalone)

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

## MCP Chrome DevTools Workflow

This skill integrates with **chrome-devtools-mcp** for fetching authenticated pages.

### MCP Tools Used

| Tool | Description |
|------|-------------|
| `list_mcp_servers` | Check if chrome-devtools MCP is available |
| `add_mcp_server` | Add chrome-devtools MCP if missing |
| `navigate` | Navigate Chrome to URL |
| `get_html` | Get page HTML content |
| `get_content` | Alternative to get HTML |
| `take_screenshot` | Optional: Take page screenshot |

### Workflow for AI Assistant

1. **Check**: Call `list_mcp_servers` to verify chrome-devtools is configured
2. **Install**: If missing, call `add_mcp_server` with chrome-devtools config
3. **Navigate**: Call `call_mcp_tool` with `navigate` tool
4. **Fetch**: Call `call_mcp_tool` with `get_html` tool
5. **Convert**: Use the HTML content and convert to Markdown

### Example MCP Config (if needed)

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

## Chrome/Puppeteer Mode (Standalone)

For CLI usage without MCP, use `--chrome` flag to control Chrome directly via Puppeteer.

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

### Auto-Launch Mode

If no existing Chrome is found, the script will automatically launch a new headless Chrome browser.

## Features

- **MCP Integration**: Works with AI assistants via chrome-devtools-mcp
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
- **HTML entity decoding**: Converts &amp;, &lt etc.
- **;, &gt;,Smart whitespace handling**:lines
- ** Cleans up excessive newRedirect following**: Automatically follows HTTP redirects

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
