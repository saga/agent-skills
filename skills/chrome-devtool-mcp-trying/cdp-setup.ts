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
