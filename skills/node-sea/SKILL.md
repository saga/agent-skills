---
name: "node-sea"
description: "Creates Node.js Single Executable Applications (SEA). Invoke when user wants to package a Node.js script into a standalone executable that runs without Node.js installed."
---

# Node.js Single Executable Application (SEA) Builder

This skill packages a Node.js application into a single executable file that can run on systems without Node.js installed.

## When to Use

- User wants to distribute a Node.js app without requiring Node.js installation
- User needs to create a standalone executable from a JavaScript file
- User wants to package a CLI tool for easy distribution
- User needs to deploy Node.js applications to environments without Node.js

## Prerequisites

- Node.js v20.6.0 or later (v22 LTS recommended)
- The `postject` package (installed automatically if needed)

## Usage

### Command Line

```bash
node node-sea.mjs <entry-file> [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-o, --output <name>` | Output executable name (default: entry-file name) |
| `--use-code-cache` | Enable code cache for faster startup |
| `--use-snapshot` | Enable snapshot for faster startup |
| `-a, --asset <name=path>` | Add asset file (can be used multiple times) |
| `--disable-warning` | Disable SEA experimental warning |
| `-h, --help` | Show help message |

### Examples

```bash
# Basic usage
node node-sea.mjs app.js

# Specify output name
node node-sea.mjs app.js -o myapp

# Enable code cache for faster startup
node node-sea.mjs app.js --use-code-cache

# Include asset files
node node-sea.mjs app.js -a config.json=./config.json -a data.db=./data.db

# Full example with all options
node node-sea.mjs server.js -o myserver --use-code-cache -a .env=./.env
```

## How It Works

The SEA builder performs these steps:

1. **Validate Environment**: Checks Node.js version (requires v20.6.0+)
2. **Install Dependencies**: Ensures `postject` is available
3. **Generate Config**: Creates SEA configuration file
4. **Build Blob**: Uses Node.js `--experimental-sea-config` to generate blob
5. **Copy Binary**: Creates a copy of the Node.js executable
6. **Remove Signature**: Removes code signature using bundled `codesign.mjs`
7. **Inject Blob**: Embeds your script into the binary using `postject`
8. **Sign Binary**: Re-signs the binary using bundled `codesign.mjs`
9. **Cleanup**: Removes temporary files

## Bundled Tools

This skill includes a cross-platform code signing utility:

### codesign.mjs

A Node.js script that provides unified code signing across platforms:

```bash
# Remove signature
node codesign.mjs remove <binary-path>

# Add signature
node codesign.mjs sign <binary-path>

# Verify signature
node codesign.mjs verify <binary-path>
```

**Platform Support:**
- **macOS**: Uses native `codesign` command
- **Windows**: Uses `signtool` from Windows SDK (auto-detected)
- **Linux**: No-op (no standard code signing)

## Output

The result is a single executable file:
- **Windows**: `app.exe` (or specified name with `.exe`)
- **macOS/Linux**: `app` (or specified name)

## Important Notes

### Limitations

- Only supports CommonJS module system for the entry script
- Cross-platform builds require building on the target platform
- Code cache and snapshot must be disabled for cross-platform builds

### Platform-Specific Notes

**Windows:**
- Output automatically gets `.exe` extension
- May show security warnings due to unsigned binary
- Can be signed with certificate using `codesign.mjs` or `signtool`

**macOS:**
- Uses bundled `codesign.mjs` which calls native `codesign`
- May need to allow the app in Security & Privacy settings
- Gatekeeper may block unsigned binaries
- Ad-hoc signing is used by default (no certificate required)

**Linux:**
- No code signing mechanism
- Binary may need `chmod +x` to make executable

### Asset Files

You can bundle additional files into the executable:

```bash
node node-sea.mjs app.js -a config.json=./config.json
```

In your application, access assets using:

```javascript
const { getAsset } = require('node:sea');
const config = JSON.parse(getAsset('config.json', 'utf8'));
```

## Error Handling

- Validates Node.js version before building
- Checks for required tools (postject)
- Provides clear error messages for common issues
- Cleans up temporary files even on failure

## Example Application

Create a simple CLI tool:

```javascript
// hello.js
console.log(`Hello, ${process.argv[2] || 'World'}!`);
```

Build it:

```bash
node node-sea.mjs hello.js -o hello
```

Run it:

```bash
# Windows
.\hello.exe Alice

# macOS/Linux
./hello Alice
```

Output:
```
Hello, Alice!
```
