import { exec, spawn, execSync } from "child_process";
import { existsSync } from "fs";
import { platform, tmpdir, homedir } from "os";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);
const PLATFORM = platform();

async function checkNodeVersion(): Promise<void> {
  let version: string;
  try {
    const { stdout } = await execAsync("node --version");
    version = stdout.trim();
  } catch (e) {
    throw new Error(
      `Node.js is not installed or not in PATH.\n` +
      `Install from: https://nodejs.org/ (v20.19 or newer required)`
    );
  }
  const major = parseInt(version.replace("v", "").split(".")[0], 10);
  const minor = parseInt(version.replace("v", "").split(".")[1], 10);
  if (major < 20 || (major === 20 && minor < 19)) {
    throw new Error(`Node.js ${version} is too old. Required: v20.19 or newer.`);
  }
  console.log(`✓ Node.js ${version}`);
}

function findChromePath(): string {
  const candidates: string[] = [];
  if (PLATFORM === "win32") {
    const programFiles = process.env["PROGRAMFILES"] ?? "C:\\Program Files";
    const programFilesX86 = process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)";
    const localAppData = process.env["LOCALAPPDATA"] ?? "";
    candidates.push(
      join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
      join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    );
  } else if (PLATFORM === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
      join(homedir(), "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome"),
    );
  } else {
    candidates.push("/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium");
  }

  for (const p of candidates) {
    if (existsSync(p)) {
      console.log(`✓ Chrome found at: ${p}`);
      return p;
    }
  }
  try {
    const cmd = PLATFORM === "win32" ? "where chrome" : "which google-chrome || which chromium";
    const result = execSync(cmd, { encoding: "utf8" });
    const found = result.trim().split("\n")[0];
    if (found && existsSync(found)) {
      console.log(`✓ Chrome found via PATH: ${found}`);
      return found;
    }
  } catch { /* ignore */ }

  throw new Error(
    `Chrome is not installed or not found.\nSearched:\n${candidates.map(p => `  - ${p}`).join("\n")}\n\nInstall from: https://www.google.com/chrome/`
  );
}

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { stdout } = await execAsync(`curl -s --max-time 1 http://127.0.0.1:${port}/json/version`);
      if (stdout.includes("webSocketDebuggerUrl") || stdout.includes("Browser")) return;
    } catch { /* not ready */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(
    `Chrome did not start listening on port ${port} within ${timeoutMs / 1000}s.\n` +
    `Possible causes: Chrome crashed, port in use, or needs display.\n` +
    `Check manually: http://127.0.0.1:${port}/json/version`
  );
}

async function launchChromeWithDebugging(chromePath: string): Promise<void> {
  const port = 9222;
  const userDataDir = join(tmpdir(), "chrome-devtools-mcp-debug");

  // Check if Chrome already listening on port
  try {
    const { stdout } = await execAsync(`curl -s --max-time 1 http://127.0.0.1:${port}/json/version`);
    if (stdout.includes("webSocketDebuggerUrl") || stdout.includes("Browser")) {
      console.log(`✓ Chrome already listening on port ${port}`);
      return;
    }
  } catch { /* not running yet */ }

  console.log(`Launching Chrome with --remote-debugging-port=${port}...`);
  const chromeArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
  ];

  const chromeProcess = spawn(chromePath, chromeArgs, { detached: true, stdio: "ignore" });
  chromeProcess.unref();

  await waitForPort(port, 15000);
  console.log(`✓ Chrome is listening on port ${port}`);
}

async function navigateAndGetContent(url: string): Promise<void> {
  console.log(`\nNavigating to: ${url}`);
  console.log("Using chrome-devtools-mcp to fetch page content...\n");

  // We'll use chrome-devtools-mcp as a one-shot script via CDP directly
  // Since we have Chrome with remote debugging, use the CDP JSON API to get tabs
  const { stdout: tabsJson } = await execAsync(`curl -s http://127.0.0.1:9222/json`);
  const tabs = JSON.parse(tabsJson);
  console.log(`Current tabs: ${tabs.length}`);

  // Use chrome-devtools-mcp's navigate capability via spawning it with stdio
  // Actually: let's use CDP directly via WebSocket to navigate and get content
  const wsUrl = tabs[0]?.webSocketDebuggerUrl;
  if (!wsUrl) throw new Error("No Chrome tabs found. Chrome may not have opened a tab.");

  console.log(`\nConnected to Chrome tab. WebSocket: ${wsUrl}`);
  console.log(`\nTo get content from ${url}:`);
  console.log(`  npx -y chrome-devtools-mcp@latest --browser-url http://127.0.0.1:9222`);
  console.log(`\n[chrome-devtools-mcp is ready to use with your MCP client]`);
}

async function main(): Promise<void> {
  console.log(`Platform: ${PLATFORM}`);
  console.log("Starting chrome-devtools-mcp setup...\n");

  try {
    await checkNodeVersion();
    const chromePath = findChromePath();
    await launchChromeWithDebugging(chromePath);

    console.log("\n" + "=".repeat(60));
    console.log("✓ SETUP COMPLETE");
    console.log("=".repeat(60));
    console.log("\nMCP config to add to your client:\n");
    if (PLATFORM === "win32") {
      console.log(JSON.stringify({
        mcpServers: {
          "chrome-devtools": {
            command: "cmd",
            args: ["/c", "npx", "-y", "chrome-devtools-mcp@latest", "--browser-url", "http://127.0.0.1:9222"],
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
            args: ["-y", "chrome-devtools-mcp@latest", "--browser-url", "http://127.0.0.1:9222"]
          }
        }
      }, null, 2));
    }
    console.log("=".repeat(60));
  } catch (err: any) {
    console.error("\n❌ FAILED\n");
    console.error(err.message ?? String(err));
    process.exit(1);
  }
}

main();
