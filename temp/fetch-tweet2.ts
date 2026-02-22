import { createConnection } from "net";

const WS_ID = "E8AE02AFCAEF1D689A8902E691905228";
const WS_PATH = `/devtools/page/${WS_ID}`;
const WS_HOST = "127.0.0.1:9222";
const PORT = 9222;

let msgId = 1;
const pendingCallbacks: Map<number, { resolve: (v: any) => void; reject: (e: any) => void }> = new Map();
let socket: ReturnType<typeof createConnection>;
let receiveBuffer = Buffer.alloc(0);

function parseWsFrames(buf: Buffer): { frames: string[]; rest: Buffer } {
  const frames: string[] = [];
  let offset = 0;
  while (offset < buf.length) {
    if (offset + 2 > buf.length) break;
    const b0 = buf[offset];
    const b1 = buf[offset + 1];
    const opcode = b0 & 0x0f;
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
      const maskKey = buf.slice(offset + headerLen - 4, offset + headerLen);
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i % 4];
      }
    }
    if (opcode === 1 || opcode === 0) { // text or continuation
      frames.push(payload.toString("utf8"));
    }
    offset += headerLen + payloadLen;
  }
  return { frames, rest: buf.slice(offset) };
}

function onData(data: Buffer): void {
  receiveBuffer = Buffer.concat([receiveBuffer, data]);
  const { frames, rest } = parseWsFrames(receiveBuffer);
  receiveBuffer = rest;
  for (const frame of frames) {
    try {
      const msg = JSON.parse(frame);
      if (msg.id && pendingCallbacks.has(msg.id)) {
        const cb = pendingCallbacks.get(msg.id)!;
        pendingCallbacks.delete(msg.id);
        if (msg.error) cb.reject(new Error(JSON.stringify(msg.error)));
        else cb.resolve(msg.result);
      }
    } catch { /* event, not a response */ }
  }
}

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
    throw new Error("too large");
  }
  return Buffer.concat([header, mask, masked]);
}

function cdpSend(method: string, params: Record<string, unknown> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pendingCallbacks.set(id, { resolve, reject });
    socket.write(buildWsFrame(JSON.stringify({ id, method, params })));
    setTimeout(() => {
      if (pendingCallbacks.has(id)) {
        pendingCallbacks.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }
    }, 15000);
  });
}

async function waitMs(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function main(): Promise<void> {
  socket = createConnection(PORT, "127.0.0.1");

  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => {
      const handshake = [
        `GET ${WS_PATH} HTTP/1.1`,
        `Host: ${WS_HOST}`,
        `Upgrade: websocket`,
        `Connection: Upgrade`,
        `Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==`,
        `Sec-WebSocket-Version: 13`,
        ``, ``
      ].join("\r\n");
      socket.write(handshake);
    });
    let upgraded = false;
    socket.on("data", (data: Buffer) => {
      if (!upgraded) {
        const str = data.toString();
        if (str.includes("101")) {
          upgraded = true;
          socket.on("data", onData);
          // Process any remaining data after HTTP headers
          const headerEnd = data.indexOf("\r\n\r\n");
          if (headerEnd !== -1 && headerEnd + 4 < data.length) {
            onData(data.slice(headerEnd + 4));
          }
          resolve();
        } else {
          reject(new Error(`WS upgrade failed: ${str.slice(0, 300)}`));
        }
        return;
      }
    });
    socket.once("error", reject);
  });

  console.log("✓ CDP WebSocket connected");

  await cdpSend("Page.enable");
  await cdpSend("Runtime.enable");

  console.log("Waiting for page to fully load (X.com needs JS execution)...");
  await waitMs(6000); // X.com is heavy SPA, needs time to render

  console.log("Extracting content...\n");

  const titleR = await cdpSend("Runtime.evaluate", {
    expression: "document.title",
    returnByValue: true,
    awaitPromise: false,
  });
  console.log(`Title: ${titleR?.result?.value}`);

  const hrefR = await cdpSend("Runtime.evaluate", {
    expression: "location.href",
    returnByValue: true,
  });
  console.log(`URL: ${hrefR?.result?.value}`);

  const contentR = await cdpSend("Runtime.evaluate", {
    expression: `(() => {
      const tweetTexts = [...document.querySelectorAll('[data-testid="tweetText"]')].map(el => el.innerText);
      const articles = [...document.querySelectorAll('article')].map(el => el.innerText.trim().slice(0, 800));
      const mainText = (document.querySelector('main') || document.body).innerText.slice(0, 5000);
      return JSON.stringify({ tweetTexts, articles: articles.slice(0, 5), mainText });
    })()`,
    returnByValue: true,
  });

  let content: any = {};
  try { content = JSON.parse(contentR?.result?.value ?? "{}"); } catch { content.mainText = contentR?.result?.value; }

  console.log("\n=== TWEET TEXTS ===");
  if (content.tweetTexts?.length) {
    content.tweetTexts.forEach((t: string) => { console.log(t); console.log("---"); });
  } else {
    console.log("(none — page may need login or more load time)");
  }

  console.log("\n=== ARTICLES ===");
  if (content.articles?.length) {
    content.articles.forEach((t: string, i: number) => {
      console.log(`[Article ${i+1}]`);
      console.log(t);
      console.log("---");
    });
  } else {
    console.log("(none)");
  }

  console.log("\n=== MAIN TEXT (first 3000 chars) ===");
  console.log((content.mainText ?? "").slice(0, 3000));

  socket.destroy();
}

main().catch(err => {
  console.error("\n❌ FAILED:", err.message);
  process.exit(1);
});
