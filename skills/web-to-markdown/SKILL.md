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

## Usage

### Command Line

```bash
node web-to-markdown.mjs <URL> [output-file]
```

Or run the bundled version:

```bash
node dist/web-to-markdown.js <URL> [output-file]
```

### Examples

```bash
# Basic usage - saves to article.md
node web-to-markdown.mjs https://example.com/article

# Specify output file
node web-to-markdown.mjs https://example.com/article ./docs/my-article.md

# With directory
node web-to-markdown.mjs https://example.com/article ./output/article.md
```

## Features

- **Zero dependencies**: Built-in HTML to Markdown converter, no external packages required
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

## Implementation Details

The converter uses a pure Node.js implementation:
- Uses native https/http modules for fetching
- Regex-based HTML-to-Markdown transformations
- No external dependencies required

Build with Vite for optimized bundle:
```bash
npx vite build
```

## Error Handling

- Handles HTTP redirects (3xx responses)
- 30-second request timeout
- Clear error messages for network issues
- Validates URL format
