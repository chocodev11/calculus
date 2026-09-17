#!/usr/bin/env node
/**
 * Fast Web Screenshot Preview Tool for Calculus
 * 
 * Captures pixel-perfect screenshots of the running Vite app in ~1-2 seconds
 * without spinning up heavy browser subagents, saving tens of thousands of LLM tokens.
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execSync } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PREVIEW_DIR = path.join(ROOT_DIR, '.preview');

// Common executable paths for Chrome / Edge / Chromium
const BROWSER_PATHS = [
  process.env.CHROME_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.EDGE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
].filter(Boolean);

// Standard viewport presets
const VIEWPORTS = {
  desktop: { width: 1440, height: 900, isMobile: false },
  laptop: { width: 1280, height: 800, isMobile: false },
  tablet: { width: 768, height: 1024, isMobile: true },
  mobile: { width: 390, height: 844, isMobile: true },
  tall: { width: 1440, height: 2400, isMobile: false },
};

function findBrowser() {
  for (const p of BROWSER_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  // Try finding via `where` on Windows or `which` on Unix
  try {
    const cmd = process.platform === 'win32' ? 'where chrome msedge' : 'which google-chrome chromium';
    const out = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf-8' }).trim();
    const firstMatch = out.split(/\r?\n/)[0];
    if (firstMatch && fs.existsSync(firstMatch)) return firstMatch;
  } catch {}
  return null;
}

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: '/', timeout: 1000 }, (res) => {
      resolve(true);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function resolveServerPort(preferredPort) {
  if (preferredPort) {
    const ok = await checkPort(preferredPort);
    if (!ok) {
      console.warn(`[!] Port ${preferredPort} did not respond, attempting anyway...`);
    }
    return preferredPort;
  }
  // Check common Vite ports
  if (await checkPort(3000)) return 3000;
  if (await checkPort(5173)) return 5173;
  if (await checkPort(8000)) return 8000;
  return 3000; // fallback
}

function parseArgs(args) {
  const options = {
    route: '/',
    port: null,
    viewport: 'desktop',
    fullPage: false,
    selector: null,
    delay: 300,
    scale: 1.5,
    output: null,
    open: false,
    watch: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--full' || arg === '-f') {
      options.fullPage = true;
    } else if (arg === '--open') {
      options.open = true;
    } else if (arg === '--watch' || arg === '-w') {
      options.watch = true;
    } else if (arg === '--port' || arg === '-p') {
      options.port = parseInt(args[++i], 10);
    } else if (arg === '--viewport' || arg === '-v') {
      options.viewport = args[++i];
    } else if (arg === '--selector' || arg === '-s') {
      options.selector = args[++i];
    } else if (arg === '--delay' || arg === '-d') {
      options.delay = parseInt(args[++i], 10);
    } else if (arg === '--scale') {
      options.scale = parseFloat(args[++i]);
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (!arg.startsWith('-')) {
      // Positional argument: route or URL
      options.route = arg;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Calculus Fast Preview Tool (Zero-Token Browser Alternative)
===========================================================
Usage:
  node tools/preview.mjs [route_or_url] [options]
  just preview [route] [options]

Arguments:
  [route]                 Path or full URL to capture (default: "/")
                          Examples: "/", "/explore", "/studio", "/course/toan-10-menh-de"

Options:
  -v, --viewport <name>   Viewport preset or custom WxH (default: "desktop")
                          Presets: desktop (1440x900), laptop (1280x800),
                                   tablet (768x1024), mobile (390x844), tall (1440x2400)
                          Custom: e.g. "1920x1080" or "400x800"
  -f, --full              Capture the full scrollable page height
  -s, --selector <css>    Capture only the element matching this CSS selector
  -p, --port <number>     Server port (auto-detects 3000, 5173, default: auto)
  -d, --delay <ms>        Extra wait time after network idle (default: 300ms)
      --scale <factor>    Device scale factor for retina crispness (default: 1.5)
  -o, --output <path>     Custom output image path (default: .preview/preview.png)
      --open              Automatically open captured image in default system viewer
  -w, --watch             Watch frontend/src files and re-capture on change
  -h, --help              Show this help message

Examples:
  just preview
  just preview /explore
  just preview /explore --full
  just preview /studio --viewport mobile
  node tools/preview.mjs /course/intro -s ".sandbox-panel"
`);
}

function ensurePreviewViewer() {
  const viewerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Calculus Live Preview</title>
  <style>
    body {
      margin: 0;
      background: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 16px;
      box-sizing: border-box;
    }
    header {
      width: 100%;
      max-width: 1440px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: #1e293b;
      border-radius: 10px;
      margin-bottom: 16px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
    }
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #94a3b8;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px #22c55e;
    }
    .image-container {
      max-width: 100%;
      display: flex;
      justify-content: center;
      background: #1e293b;
      padding: 8px;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      display: block;
    }
  </style>
</head>
<body>
  <header>
    <div style="font-weight: 700; font-size: 16px; color: #38bdf8;">TiaMath Preview Hub</div>
    <div class="status">
      <span class="dot"></span>
      <span id="timestamp">Listening for updates...</span>
    </div>
  </header>
  <div class="image-container">
    <img id="preview-img" src="preview.png" alt="Preview screenshot" />
  </div>
  <script>
    let lastModified = 0;
    const img = document.getElementById('preview-img');
    const ts = document.getElementById('timestamp');

    async function checkUpdate() {
      try {
        const res = await fetch('preview.png', { method: 'HEAD', cache: 'no-store' });
        const mod = res.headers.get('last-modified');
        if (mod && mod !== lastModified) {
          lastModified = mod;
          img.src = 'preview.png?t=' + Date.now();
          ts.textContent = 'Updated: ' + new Date().toLocaleTimeString();
        }
      } catch (e) {}
    }
    setInterval(checkUpdate, 1000);
    checkUpdate();
  </script>
</body>
</html>`;

  const htmlPath = path.join(PREVIEW_DIR, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    fs.writeFileSync(htmlPath, viewerHtml, 'utf-8');
  }
}

async function captureScreenshot(options) {
  const executablePath = findBrowser();
  if (!executablePath) {
    console.error('[!] Error: No Chrome or Edge installation found on this system.');
    process.exit(1);
  }

  const port = await resolveServerPort(options.port);
  let targetUrl = options.route;
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    const cleanRoute = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
    targetUrl = `http://localhost:${port}${cleanRoute}`;
  }

  // Parse viewport
  let vp = VIEWPORTS[options.viewport.toLowerCase()];
  if (!vp) {
    const match = options.viewport.match(/^(\d+)x(\d+)$/i);
    if (match) {
      vp = { width: parseInt(match[1], 10), height: parseInt(match[2], 10), isMobile: false };
    } else {
      console.warn(`[!] Unknown viewport "${options.viewport}", defaulting to desktop (1440x900)`);
      vp = VIEWPORTS.desktop;
    }
  }

  // Ensure output directory
  if (!fs.existsSync(PREVIEW_DIR)) {
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  }
  ensurePreviewViewer();

  const outputPath = options.output
    ? path.resolve(process.cwd(), options.output)
    : path.join(PREVIEW_DIR, 'preview.png');

  const startTime = Date.now();

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'shell',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--hide-scrollbars',
      '--mute-audio',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: options.scale || 1.5,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });

    // Navigate to page
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });
    } catch (e) {
      // Fallback: wait for domcontentloaded if networkidle0 times out
      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
      } catch (err) {
        console.error(`[!] Failed to connect to ${targetUrl}. Is the dev server running on port ${port}?`);
        throw err;
      }
    }

    // Optional delay for CSS transitions / math render
    if (options.delay > 0) {
      await new Promise(r => setTimeout(r, options.delay));
    }

    // Take screenshot
    if (options.selector) {
      const element = await page.$(options.selector);
      if (!element) {
        console.warn(`[!] Selector "${options.selector}" not found on page, capturing full viewport instead.`);
        await page.screenshot({ path: outputPath, fullPage: options.fullPage });
      } else {
        await element.screenshot({ path: outputPath });
      }
    } else {
      await page.screenshot({ path: outputPath, fullPage: options.fullPage });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const stats = fs.statSync(outputPath);
    const sizeKb = (stats.size / 1024).toFixed(1);

    console.log(`[v] Captured ${targetUrl} [${vp.width}x${options.fullPage ? 'auto(full)' : vp.height}] in ${elapsed}s`);
    console.log(`    Saved: ${outputPath} (${sizeKb} KB)`);

    if (options.open) {
      const openCmd = process.platform === 'win32'
        ? `start "" "${outputPath}"`
        : process.platform === 'darwin'
        ? `open "${outputPath}"`
        : `xdg-open "${outputPath}"`;
      exec(openCmd);
    }
  } finally {
    await browser.close();
  }
}

async function startWatch(options) {
  const watchDir = path.join(ROOT_DIR, 'frontend', 'src');
  console.log(`[*] Watching ${watchDir} for changes...`);
  console.log(`[*] Press Ctrl+C to stop.\n`);

  let timeoutId = null;
  const triggerCapture = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      console.log(`\n[~] Change detected, capturing preview...`);
      try {
        await captureScreenshot(options);
      } catch (err) {
        console.error(`[!] Capture error:`, err.message);
      }
    }, 600);
  };

  // Initial capture
  await captureScreenshot(options);

  fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
    if (filename && (filename.endsWith('.jsx') || filename.endsWith('.tsx') || filename.endsWith('.js') || filename.endsWith('.ts') || filename.endsWith('.css'))) {
      triggerCapture();
    }
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (options.watch) {
    await startWatch(options);
  } else {
    await captureScreenshot(options);
  }
}

main().catch((err) => {
  console.error('[!] Unexpected error:', err);
  process.exit(1);
});
