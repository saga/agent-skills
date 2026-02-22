---
name: chrome-devtool-mcp-trying
description: Launch chrome-devtools-mcp connected to the user's real Chrome profile (preserving login sessions) on Mac/Windows. Includes full CDP-based page browsing capability. Returns raw error messages on failure — no fallbacks.
---

# Chrome DevTools MCP - Launch and Browse

## Overview

This skill:
1. **Launches Chrome using the user's real profile** (so all logins, cookies, and sessions are preserved — no re-login needed)
2. **Starts chrome-devtools-mcp** connected to that Chrome instance via `--browser-url http://127.0.0.1:9222`
3. **Navigates to any URL and extracts page content** via CDP (Chrome DevTools Protocol) over WebSocket

**Key behaviors:**
- Uses the user's **real Chrome profile directory** (`Default` profile), not a temp dir
- If Chrome is already running without `--remote-debugging-port`, kills it and restarts with debugging enabled (required — Chrome ignores the flag if already running)
- If Chrome is already running **with** debugging on port 9222, reuses it directly
- On any failure: returns raw error output, no fallbacks, no puppeteer

## When to Use

- User wants to browse/scrape pages that require login (X/Twitter, GitHub, etc.)
- User wants to use `chrome-devtools-mcp` with their existing Chrome sessions
- User needs to extract content from a specific URL using their authenticated Chrome
- Any task requiring Chrome automation with real user sessions

## Important: Chrome Profile Conflict

**Chrome cannot have two instances sharing the same profile.** If Chrome is already open with the user's profile, it must be closed first before relaunching with `--remote-debugging-port`. The agent should:
1. Check if port 9222 is already listening → if yes, reuse it
2. If not, warn the user that Chrome will be restarted, then kill and relaunch with debugging

## Script 1: Setup — Launch Chrome with User Profile + Remote Debugging

Write this to a temp file and run with `npx tsx`:

```typescript
// cdp-setup.ts
// Launches Chrome with the user's real profile and --remote-debugging-port=9222
// If Chrome is already listening on 9222, skips launch and reports ready.
// If Chrome is running WITHOUT debugging, kills it and relaunches.

import { exec, spawn, execSync } from "child_process";
import { existsSync } from "fs";
import { platform, homedir } from "os";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);
const PLATFORM = platform();
const PORT = 9222;

// ─── Find Chrome executable ───────────────────────────────────────────────────

function findChromePath(): string {
  const candidates: string[] = [];

  if (PLATFORM === "win32") {
    const pf  = process.env["PROGRAMFILES"]      ?? "C:\\Program Files";
    const pf86 = process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)";
    const local = process.env["LOCALAPPDATA"]     ?? "";
    candidates.push(
      join(pf,    "Google", "Chrome", "Application", "chrome.exe"),
      join(pf86,  "Google", "Chrome", "Application", "chrome.exe"),
      join(local, "Google", "Chrome", "Application", "chrome.exe"),
    );
  } else if (PLATFORM === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      join(homedir(), "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome"),
    );
  } else {
    candidates.push("/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium");
  }

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  // PATH fallback
  try {
    const cmd = PLATFORM === "win32" ? "where chrome" : "which google-chrome";
    const found = execSync(cmd, { encoding: "utf8" }).trim().split("\n")[0];
    if (found && existsSync(found)) return found;
  } catch { /* ignore */ }

  throw new Error(
    `Chrome not found. Searched:\n${candidates.map(p => `  ${p}`).join("\n")}\nInstall from: https://www.google.com/chrome/`
  );
}

// ─── Find the user's real Chrome profile directory ────────────────────────────

function getRealUserDataDir(): string {
  if (PLATFORM === "win32") {
    const local = process.env["LOCALAPPDATA"] ?? join(homedir(), "AppData", "Local");
    return join(local, "Google", "Chrome", "User Data");
  } else if (PLATFORM === "darwin") {
    return join(homedir(), "Library", "Application Support", "Google", "Chrome");
  } else {
    return join(homedir(), ".config", "google-chrome");
  }
}

// ─── Check if port 9222 is already accepting CDP connections ─────────────────

async function isDebuggingPortOpen(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `curl -s --max-time 2 http://127.0.0.1:${PORT}/json/version`
    );
    return stdout.includes("Browser") || stdout.includes("webSocketDebuggerUrl");
  } catch {
    return false;
  }
}

// ─── Kill existing Chrome instances ──────────────────────────────────────────

async function killChrome(): Promise<void> {
  try {
    if (PLATFORM === "win32") {
      execSync("taskkill /F /IM chrome.exe /T", { stdio: "ignore" });
    } else if (PLATFORM === "darwin") {
      execSync("pkill -x 'Google Chrome' || true", { stdio: "ignore" });
    } else {
      execSync("pkill -x google-chrome || pkill -x chromium || true", { stdio: "ignore" });
    }
    // Give it time to die
    await new Promise(r => setTimeout(r, 2000));
    console.log("✓ Existing Chrome instances closed");
  } catch {
    // Chrome may not have been running — that's fine
  }
}

// ─── Wait for Chrome debugging port ──────────────────────────────────────────

async function waitForPort(timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isDebuggingPortOpen()) return;
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(
    `Chrome did not start listening on port ${PORT} within ${timeoutMs / 1000}s.\n` +
    `Check: http://127.0.0.1:${PORT}/json/version\n` +
    `Possible causes: Chrome crashed, profile locked, or port blocked.`
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`Platform: ${PLATFORM}`);

  // 1. Check if debugging port is already open
  if (await isDebuggingPortOpen()) {
    console.log(`✓ Chrome already listening on port ${PORT} — reusing existing instance`);
    const { stdout } = await execAsync(`curl -s http://127.0.0.1:${PORT}/json/version`);
    const info = JSON.parse(stdout);
    console.log(`  Browser: ${info.Browser}`);
    console.log(`\nReady. Use:\n  npx -y chrome-devtools-mcp@latest --browser-url http://127.0.0.1:${PORT}`);
    return;
  }

  // 2. Find Chrome
  const chromePath = findChromePath();
  console.log(`✓ Chrome: ${chromePath}`);

  // 3. Find user profile
  const userDataDir = getRealUserDataDir();
  if (!existsSync(userDataDir)) {
    throw new Error(
      `Chrome user data directory not found: ${userDataDir}\n` +
      `This means Chrome has never been launched on this system, or is installed in a non-standard location.`
    );
  }
  console.log(`✓ User profile: ${userDataDir}`);

  // 4. Kill existing Chrome (required — Chrome ignores --remote-debugging-port if already running)
  console.log("\n⚠  Closing existing Chrome instances to enable remote debugging...");
  console.log("   (Your profile and sessions will be preserved)");
  await killChrome();

  // 5. Relaunch with remote debugging + real user profile
  console.log(`Launching Chrome with --remote-debugging-port=${PORT}...`);
  const args = [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--restore-last-session",
  ];

  const child = spawn(chromePath, args, { detached: true, stdio: "ignore" });
  child.unref();

  // 6. Wait for it to be ready
  await waitForPort(20000);
  console.log(`✓ Chrome is listening on port ${PORT} with your real profile`);

  const { stdout } = await execAsync(`curl -s http://127.0.0.1:${PORT}/json/version`);
  const info = JSON.parse(stdout);
  console.log(`  Browser: ${info.Browser}`);

  console.log("\n" + "=".repeat(60));
  console.log("✓ SETUP COMPLETE");
  console.log("=".repeat(60));
  console.log("\nMCP config for your client:\n");
  if (PLATFORM === "win32") {
    console.log(JSON.stringify({
      mcpServers: {
        "chrome-devtools": {
          command: "cmd",
          args: ["/c", "npx", "-y", "chrome-devtools-mcp@latest", "--browser-url", `http://127.0.0.1:${PORT}`],
          env: { SystemRoot: "C:\\Windows", PROGRAMFILES: "C:\\Program Files" },
          startup_timeout_ms: 20000
        }
      }
    }, null, 2));
  } else {
    console.log(JSON.stringify({
      mcpServers: {
        "chrome-devtools": {
          command: "npx",
          args: ["-y", "chrome-devtools-mcp@latest", "--browser-url", `http://127.0.0.1:${PORT}`]
        }
      }
    }, null, 2));
  }
  console.log("=".repeat(60));
}

main().catch(err => {
  console.error("\n❌ FAILED\n");
  console.error(err.message ?? String(err));
  process.exit(1);
});
```

## Script 2: Browse — Navigate to URL and Extract Page Content via CDP

After setup, use this script to navigate to any URL and extract content. Write to temp file and run with `npx tsx`:

```typescript
// cdp-browse.ts <url>
// Opens the given URL in the Chrome instance (port 9222) and extracts page content.
// Uses native CDP over WebSocket — no puppeteer, no playwright.

import { exec } from "child_process";
import { createConnection } from "net";
import { promisify } from "util";

const execAsync = promisify(exec);
const PORT = 9222;

// ─── CDP WebSocket frame codec ────────────────────────────────────────────────

function buildWsFrame(payload: string): Buffer {
  const data = Buffer.from(payload, "utf8");
  const len = data.length;
  const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const masked = Buffer.from(data);
  for (let i = 0; i < masked.length; i++) masked[i] ^= mask[i % 4];

  let header: Buffer;
  if (len <= 125) {
    header = Buffer.from([0x81, 0x80 | len]);
  } else if (len <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81; header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
  } else {
    throw new Error("Payload too large for single WebSocket frame");
  }
  return Buffer.concat([header, mask, masked]);
}

function parseWsFrames(buf: Buffer): { frames: string[]; rest: Buffer } {
  const frames: string[] = [];
  let offset = 0;
  while (offset < buf.length) {
    if (offset + 2 > buf.length) break;
    const b1 = buf[offset + 1];
    const masked = !!(b1 & 0x80);
    let payloadLen = b1 & 0x7f;
    let headerLen = 2;
    if (payloadLen === 126) {
      if (offset + 4 > buf.length) break;
      payloadLen = buf.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buf.length) break;
      payloadLen = Number(buf.readBigUInt64BE(offset + 2));
      headerLen = 10;
    }
    if (masked) headerLen += 4;
    if (offset + headerLen + payloadLen > buf.length) break;
    let payload = buf.slice(offset + headerLen, offset + headerLen + payloadLen);
    if (masked) {
      const mk = buf.slice(offset + headerLen - 4, offset + headerLen);
      for (let i = 0; i < payload.length; i++) payload[i] ^= mk[i % 4];
    }
    const opcode = buf[offset] & 0x0f;
    if (opcode === 1 || opcode === 0) frames.push(payload.toString("utf8"));
    offset += headerLen + payloadLen;
  }
  return { frames, rest: buf.slice(offset) };
}

// ─── CDP session ──────────────────────────────────────────────────────────────

class CDPSession {
  private socket: ReturnType<typeof createConnection>;
  private msgId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private recvBuf = Buffer.alloc(0);

  constructor(socket: ReturnType<typeof createConnection>) {
    this.socket = socket;
    this.socket.on("data", (data: Buffer) => {
      this.recvBuf = Buffer.concat([this.recvBuf, data]);
      const { frames, rest } = parseWsFrames(this.recvBuf);
      this.recvBuf = rest;
      for (const frame of frames) {
        try {
          const msg = JSON.parse(frame);
          const cb = this.pending.get(msg.id);
          if (cb) {
            this.pending.delete(msg.id);
            if (msg.error) cb.reject(new Error(`CDP error: ${JSON.stringify(msg.error)}`));
            else cb.resolve(msg.result);
          }
        } catch { /* CDP event, not a response */ }
      }
    });
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.pending.set(id, { resolve, reject });
      this.socket.write(buildWsFrame(JSON.stringify({ id, method, params })));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout (15s): ${method}`));
        }
      }, 15000);
    });
  }

  destroy(): void { this.socket.destroy(); }
}

// ─── Connect to a Chrome tab via WebSocket ────────────────────────────────────

async function connectToTab(wsUrl: string): Promise<CDPSession> {
  const m = wsUrl.match(/ws:\/\/([^/]+)(\/.*)/);
  if (!m) throw new Error(`Cannot parse WebSocket URL: ${wsUrl}`);
  const [, host, path] = m;
  const [hostname, portStr] = host.split(":");
  const port = parseInt(portStr ?? "9222", 10);

  const socket = createConnection(port, hostname);

  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => {
      socket.write([
        `GET ${path} HTTP/1.1`,
        `Host: ${host}`,
        `Upgrade: websocket`,
        `Connection: Upgrade`,
        `Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==`,
        `Sec-WebSocket-Version: 13`,
        ``, ``
      ].join("\r\n"));
    });
    let upgraded = false;
    socket.on("data", (data: Buffer) => {
      if (!upgraded) {
        upgraded = true;
        if (data.toString().includes("101")) resolve();
        else reject(new Error(`WebSocket upgrade failed: ${data.toString().slice(0, 200)}`));
      }
    });
    socket.once("error", reject);
  });

  return new CDPSession(socket);
}

// ─── Open a new tab at the given URL ─────────────────────────────────────────

async function openTab(url: string): Promise<string> {
  // Use PUT /json/new to create a tab (GET is deprecated and returns a warning)
  const { stdout } = await execAsync(
    `curl -s -X PUT "http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}"`
  );
  const tab = JSON.parse(stdout);
  if (!tab.webSocketDebuggerUrl) {
    throw new Error(`Failed to create new tab. Response: ${stdout}`);
  }
  console.log(`✓ Opened new tab: ${tab.id}`);
  return tab.webSocketDebuggerUrl;
}

// ─── Wait for page navigation to complete ────────────────────────────────────

async function waitForLoad(cdp: CDPSession, timeoutMs: number): Promise<void> {
  // Poll document.readyState
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await cdp.send("Runtime.evaluate", {
      expression: "document.readyState",
      returnByValue: true,
    });
    if (r?.result?.value === "complete") return;
    await new Promise(r => setTimeout(r, 500));
  }
}

// ─── Extract content from current page ───────────────────────────────────────

async function extractContent(cdp: CDPSession): Promise<{
  title: string;
  url: string;
  tweetTexts: string[];
  articles: string[];
  mainText: string;
}> {
  const titleR = await cdp.send("Runtime.evaluate", { expression: "document.title", returnByValue: true });
  const urlR   = await cdp.send("Runtime.evaluate", { expression: "location.href",   returnByValue: true });

  const contentR = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const tweetTexts = [...document.querySelectorAll('[data-testid="tweetText"]')]
        .map(el => el.innerText.trim());
      const articles = [...document.querySelectorAll('article')]
        .map(el => el.innerText.trim().slice(0, 1000));
      const main = document.querySelector('main') ?? document.body;
      const mainText = main.innerText.slice(0, 8000);
      return JSON.stringify({ tweetTexts, articles: articles.slice(0, 10), mainText });
    })()`,
    returnByValue: true,
  });

  let parsed: any = {};
  try { parsed = JSON.parse(contentR?.result?.value ?? "{}"); } catch { /* raw text */ }

  return {
    title:      titleR?.result?.value ?? "",
    url:        urlR?.result?.value   ?? "",
    tweetTexts: parsed.tweetTexts     ?? [],
    articles:   parsed.articles       ?? [],
    mainText:   parsed.mainText       ?? contentR?.result?.value ?? "",
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: npx tsx cdp-browse.ts <url>");
    process.exit(1);
  }

  // Verify Chrome is reachable
  try {
    await execAsync(`curl -s --max-time 2 http://127.0.0.1:${PORT}/json/version`);
  } catch {
    throw new Error(
      `Chrome is not listening on port ${PORT}.\n` +
      `Run cdp-setup.ts first to launch Chrome with remote debugging.`
    );
  }

  // Open tab and connect
  const wsUrl = await openTab(url);
  const cdp = await connectToTab(wsUrl);
  console.log("✓ CDP connected to tab");

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  // SPA sites (X/Twitter, etc.) need extra time for JS to render
  const isSPA = /x\.com|twitter\.com|github\.com/.test(url);
  const waitMs = isSPA ? 6000 : 3000;
  console.log(`Waiting ${waitMs / 1000}s for page to render...`);
  await waitForLoad(cdp, waitMs);
  if (isSPA) await new Promise(r => setTimeout(r, waitMs));

  console.log("Extracting content...\n");
  const content = await extractContent(cdp);

  console.log(`Title: ${content.title}`);
  console.log(`URL:   ${content.url}`);

  if (content.tweetTexts.length > 0) {
    console.log(`\n${"─".repeat(60)}`);
    console.log("TWEET TEXTS");
    console.log("─".repeat(60));
    content.tweetTexts.forEach((t, i) => {
      console.log(`\n[${i + 1}] ${t}`);
    });
  }

  if (content.articles.length > 0) {
    console.log(`\n${"─".repeat(60)}`);
    console.log("ARTICLES");
    console.log("─".repeat(60));
    content.articles.forEach((t, i) => {
      console.log(`\n[Article ${i + 1}]`);
      console.log(t);
    });
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log("MAIN TEXT");
  console.log("─".repeat(60));
  console.log(content.mainText);

  cdp.destroy();
}

main().catch(err => {
  console.error("\n❌ FAILED\n");
  console.error(err.message ?? String(err));
  process.exit(1);
});
```

## How the Agent Should Use This Skill

### Step 1: Setup (once per session)

Write `Script 1` above to a temp file and run:

```sh
npx tsx /tmp/cdp-setup.ts        # Mac/Linux
npx tsx %TEMP%\cdp-setup.ts      # Windows
```

**What happens:**
- If Chrome is already listening on 9222 → reuses it (no restart)
- If Chrome is running without debugging → kills it, relaunches with `--user-data-dir` pointing to the user's **real profile**, so all logins are intact
- Prints the MCP config JSON if successful

### Step 2: Browse any URL

Write `Script 2` to a temp file and run:

```sh
npx tsx /tmp/cdp-browse.ts "https://x.com/someone/status/123"
```

The script opens a new tab, waits for JS to render (longer for SPAs like X/Twitter), and extracts:
- Tweet texts (`[data-testid="tweetText"]`)
- Article elements
- Full main text

### Error Handling Rules

- **DO NOT** use puppeteer, playwright, or any alternative if these scripts fail
- **DO NOT** rephrase or soften error messages — output them verbatim
- **DO NOT** try to work around Chrome not being installed
- If `cdp-setup.ts` fails → stop and report the error
- If `cdp-browse.ts` fails → stop and report the error

## Platform-Specific Notes

### Windows
- Chrome user profile: `%LOCALAPPDATA%\Google\Chrome\User Data`
- MCP client config must use `cmd /c npx ...` wrapper + `SystemRoot`/`PROGRAMFILES` env vars
- `startup_timeout_ms` should be ≥ 20000

### macOS
- Chrome user profile: `~/Library/Application Support/Google/Chrome`
- If MCP client uses macOS Seatbelt sandboxing: Chrome cannot start from within the sandbox → use `--browser-url` to connect to a manually launched instance
- Grant Bluetooth permission to the MCP client app if Chrome crashes on Bluetooth prompts: **System Settings > Privacy & Security > Bluetooth**

### Important: Chrome Single-Instance Constraint

Chrome enforces single-instance per profile. If Chrome is already running with the user's profile but **without** `--remote-debugging-port`, the port will never open even if you launch another Chrome process with it. The setup script handles this by:

1. Checking if port 9222 is already open (if yes → done)
2. Killing all Chrome processes for that profile
3. Relaunching with `--remote-debugging-port=9222` and the real `--user-data-dir`

## Error Reference

| Error | Meaning | Fix |
|---|---|---|
| `Chrome not found` | Chrome not installed or in non-standard path | Install Chrome or check path |
| `User data directory not found` | Chrome never launched on this system | Launch Chrome manually first |
| `Port 9222 timeout` | Chrome failed to start or profile is locked | Check if profile is in use by another Chrome instance |
| `ERR_MODULE_NOT_FOUND` | npm/npx cache issue | `rm -rf ~/.npm/_npx && npm cache clean --force` |
| `WebSocket upgrade failed` | CDP connection refused | Verify port 9222 is open: `curl http://127.0.0.1:9222/json/version` |
| `CDP timeout` | Page didn't respond | Increase wait time for heavy SPAs |

## Debug Mode

```sh
# Verbose CDP logging
DEBUG=* npx -y chrome-devtools-mcp@latest --browser-url http://127.0.0.1:9222 --log-file=/tmp/cdp-mcp.log
```
