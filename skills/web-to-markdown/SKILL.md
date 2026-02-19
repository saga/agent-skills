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

## Prerequisites (Optional)

For better conversion quality, install the `turndown` package:

```bash
npm install turndown
```

The script will automatically use turndown if available, otherwise it falls back to a native converter.

## Usage

### Command Line

```bash
node web-to-markdown.mjs <URL> [output-file]
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

- **Dual-mode conversion**: Uses turndown package if available, native converter as fallback
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

The converter uses a dual-mode approach:

### With turndown (recommended)
- Uses the battle-tested turndown library for accurate HTML-to-Markdown conversion
- Supports all CommonMark features
- Better handling of edge cases

### Without turndown (fallback)
- Uses pure Node.js with no external dependencies
- Regex-based HTML-to-Markdown transformations
- Suitable for basic conversion needs

Both modes follow the same workflow:
1. Fetches content using native `https`/`http` modules
2. Extracts main content using common HTML patterns
3. Cleans HTML by removing non-content elements
4. Converts HTML to Markdown
5. Writes output to specified file or generates filename from URL

## Error Handling

- Handles HTTP redirects (3xx responses)
- 30-second request timeout
- Clear error messages for network issues
- Validates URL format
