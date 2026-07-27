import http from "http";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";

process.title = "simple-bar-theme-helper";

const PORT = 7778;
const HOME = os.homedir();
const SIMPLEBARRC =
  process.env.SIMPLEBARRC || path.join(HOME, ".simplebarrc");
const SIMPLE_BAR_DIR =
  process.env.SIMPLE_BAR_DIR ||
  path.join(HOME, "Library/Application Support/Übersicht/widgets/simple-bar");
const THEMES_JS = path.join(SIMPLE_BAR_DIR, "lib/styles/themes.js");
const INDEX_JSX = path.join(SIMPLE_BAR_DIR, "index.jsx");

// Re-read themes.js on every request so newly registered themes are
// allowed without restarting the helper.
function availableThemes() {
  const src = fs.readFileSync(THEMES_JS, "utf8");
  return [...src.matchAll(/^\s*(\w+):\s*\w+\.theme,/gm)].map((m) => m[1]);
}

function readSettings() {
  return JSON.parse(fs.readFileSync(SIMPLEBARRC, "utf8"));
}

function applyTheme(key) {
  const settings = readSettings();
  const previous = settings.themes?.lightTheme;
  settings.themes = settings.themes || {};
  settings.themes.lightTheme = key;
  settings.themes.darkTheme = key;
  const temporaryPath = `${SIMPLEBARRC}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(
      temporaryPath,
      JSON.stringify(settings, null, 2) + "\n",
      { mode: 0o600 },
    );
    fs.renameSync(temporaryPath, SIMPLEBARRC);
  } finally {
    try {
      fs.unlinkSync(temporaryPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  // touch index.jsx so Übersicht re-runs module-level Settings.init(),
  // which copies .simplebarrc into the webview's localStorage
  const now = new Date();
  fs.utimesSync(INDEX_JSX, now, now);
  execFile("osascript", [
    "-e",
    'tell application id "tracesOf.Uebersicht" to refresh',
  ]);
  return previous;
}

function send(res, code, body, allowPreviewOrigin = false) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    ...(allowPreviewOrigin
      ? { "Access-Control-Allow-Origin": "null", Vary: "Origin" }
      : {}),
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const origin = req.headers.origin;
  const previewRequest = origin === "null";
  try {
    if (req.method === "OPTIONS") {
      if (!previewRequest) {
        return send(res, 403, { ok: false, error: "origin not allowed" });
      }
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "null",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Private-Network": "true",
        Vary: "Origin",
      });
      return res.end();
    }
    if (req.method === "GET" && url.pathname === "/status") {
      const settings = readSettings();
      return send(res, 200, {
        ok: true,
        lightTheme: settings.themes?.lightTheme,
        darkTheme: settings.themes?.darkTheme,
        available: availableThemes(),
      }, previewRequest);
    }
    if (req.method === "POST" && url.pathname === "/apply") {
      if (!previewRequest) {
        return send(res, 403, { ok: false, error: "origin not allowed" });
      }
      const key = url.searchParams.get("theme");
      const themes = availableThemes();
      if (!key || !themes.includes(key)) {
        return send(res, 400, {
          ok: false,
          error: `unknown theme "${key}"`,
          available: themes,
        }, true);
      }
      const previous = applyTheme(key);
      console.log(`[${new Date().toISOString()}] applied ${key} (was ${previous})`);
      return send(res, 200, { ok: true, theme: key, previous }, true);
    }
    return send(res, 404, {
      ok: false,
      error: "use GET /status or POST /apply?theme=<key>",
    }, previewRequest);
  } catch (e) {
    console.error(e);
    return send(res, 500, { ok: false, error: String(e.message || e) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`simple-bar-theme-helper running at http://localhost:${PORT}`);
});
