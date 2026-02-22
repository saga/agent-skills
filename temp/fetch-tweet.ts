import { exec } from "child_process";
import { promisify } from "util";
import { createConnection } from "net";

const execAsync = promisify(exec);

async function cdpSend(ws: any, method: string, params: Record<string, any> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 100000);
    const msg = JSON.stringify({ id, method, params });
    let buffer = "";

    const onData = (data: Buffer) => {
      buffer += data.toString();
      // Try to parse complete JSON messages
      try {
        const parsed = JSON.parse(buffer);
        if (parsed.id === id) {
          ws.removeListener("data", onData);
          if (parsed.error) reject(new Error(JSON.stringify(parsed.error)));
          else resolve(parsed.result);
          buffer = "";
        }
      } catch { /* incomplete JSON */ }
    };

    ws.on("data", onData);
    ws.write(buildWsFrame(msg));
  });
}

function buildWsFrame(payload: string): Buffer {
  const data = Buffer.from(payload);
  const len = data.length;
  let header: Buffer;
  if (len <= 125) {
    header = Buffer.alloc(6);
    header[0] = 0x81; // FIN + text frame
    header[1] = 0x80 | len; // MASK bit set
  } else if (len <= 65535) {
    header = Buffer.alloc(8);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
    header = Buffer.concat([header.slice(0, 4), Buffer.alloc(4)]);
  } else {
    throw new Error("Payload too large");
  }
  // Add masking key (4 bytes of zeros for simplicity in local dev)
  const mask = Buffer.from([0, 0, 0, 0]);
  return Buffer.concat([header.slice(0, header.length - 4), mask, data]);
}

async function main(): Promise<void> {
  const url = "https://x.com/koylanai/status/2025286163641118915";

  // Step 1: Get list of tabs from Chrome DevTools
  const { stdout: tabsRaw } = await execAsync("curl -s http://127.0.0.1:9222/json");
  const tabs = JSON.parse(tabsRaw);
  console.log(`Chrome has ${tabs.length} tab(s)`);

  // Step 2: Use /json/new to open a new tab with the URL
  console.log(`\nOpening: ${url}`);
  const { stdout: newTabRaw } = await execAsync(
    `curl -s "http://127.0.0.1:9222/json/new?${encodeURIComponent(url)}"`
  );
  const newTab = JSON.parse(newTabRaw);
  console.log(`New tab id: ${newTab.id}`);
  const wsDebuggerUrl: string = newTab.webSocketDebuggerUrl;
  if (!wsDebuggerUrl) throw new Error("No WebSocket URL for new tab");

  // Step 3: Wait for page to load via CDP over WebSocket
  // Extract host and path from wsDebuggerUrl
  const wsMatch = wsDebuggerUrl.match(/ws:\/\/([^/]+)(\/.*)/);
  if (!wsMatch) throw new Error(`Cannot parse WS URL: ${wsDebuggerUrl}`);
  const [, wsHost, wsPath] = wsMatch;
  const [wsHostname, wsPortStr] = wsHost.split(":");
  const wsPort = parseInt(wsPortStr ?? "9222", 10);

  // Connect via raw WebSocket (HTTP upgrade)
  const socket = createConnection(wsPort, wsHostname);

  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => {
      const handshake = [
        `GET ${wsPath} HTTP/1.1`,
        `Host: ${wsHost}`,
        `Upgrade: websocket`,
        `Connection: Upgrade`,
        `Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==`,
        `Sec-WebSocket-Version: 13`,
        ``,
        ``,
      ].join("\r\n");
      socket.write(handshake);
    });
    socket.once("data", (data) => {
      if (data.toString().includes("101")) resolve();
      else reject(new Error(`WS upgrade failed: ${data.toString().slice(0, 200)}`));
    });
    socket.once("error", reject);
  });

  console.log("WebSocket connected to tab");

  // Enable necessary domains
  await cdpSend(socket, "Page.enable");
  await cdpSend(socket, "Runtime.enable");

  // Navigate (tab already opened to the URL, but let's wait for load)
  console.log("Waiting for page to load...");
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 8000); // max 8s wait
    const onData = (data: Buffer) => {
      const msgs = data.toString().split("\n");
      for (const chunk of msgs) {
        try {
          // Parse WS frame - skip first 2 bytes header (simplified)
          // Look for loadEventFired in raw data
          if (chunk.includes("loadEventFired") || chunk.includes("Page.loadEventFired")) {
            clearTimeout(timeout);
            socket.removeListener("data", onData);
            resolve();
          }
        } catch { /* skip */ }
      }
    };
    socket.on("data", onData);
  });

  // Get page title and content via Runtime.evaluate
  console.log("Extracting page content...\n");

  const titleResult = await cdpSend(socket, "Runtime.evaluate", {
    expression: "document.title",
    returnByValue: true,
  });
  console.log(`Page title: ${titleResult?.result?.value ?? "(none)"}`);

  const urlResult = await cdpSend(socket, "Runtime.evaluate", {
    expression: "location.href",
    returnByValue: true,
  });
  console.log(`Current URL: ${urlResult?.result?.value ?? "(none)"}`);

  const bodyResult = await cdpSend(socket, "Runtime.evaluate", {
    expression: `
      (() => {
        // Try to get tweet text
        const tweetTexts = Array.from(document.querySelectorAll('[data-testid="tweetText"]'))
          .map(el => el.innerText);
        const articleTexts = Array.from(document.querySelectorAll('article'))
          .map(el => el.innerText.trim().slice(0, 500));
        const bodyText = document.body.innerText.slice(0, 3000);
        return JSON.stringify({ tweetTexts, articleTexts: articleTexts.slice(0, 3), bodyText });
      })()
    `,
    returnByValue: true,
  });

  const content = JSON.parse(bodyResult?.result?.value ?? "{}");
  console.log("\n--- Tweet Texts ---");
  if (content.tweetTexts?.length) {
    content.tweetTexts.forEach((t: string) => console.log(t));
  } else {
    console.log("(no tweet text elements found - page may require login or JS to render)");
  }

  console.log("\n--- Article Content ---");
  if (content.articleTexts?.length) {
    content.articleTexts.forEach((t: string, i: number) => {
      console.log(`[Article ${i + 1}]`);
      console.log(t);
      console.log();
    });
  } else {
    console.log("(no articles found)");
  }

  console.log("\n--- Body Text (first 2000 chars) ---");
  console.log((content.bodyText ?? "").slice(0, 2000));

  socket.destroy();
}

main().catch(err => {
  console.error("\n❌ FAILED\n");
  console.error(err.message ?? String(err));
  process.exit(1);
});
