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
