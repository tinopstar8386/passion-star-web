const path = require("path");
const fs = require("fs");
const http = require("http");
const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, screen } = require("electron");

app.setAppUserModelId("com.passionstar.arammayhem");

try {
  app.setPath("userData", path.join(app.getPath("appData"), "AramMayhem"));
} catch (_) {}

app.commandLine.appendSwitch("js-flags", "--expose_gc");
app.commandLine.appendSwitch(
  "disable-features",
  "HardwareMediaKeyHandling,AllowAggressiveThrottlingWithWebSocket,IntensiveWakeUpThrottling"
);

app.on("certificate-error", (event, _webContents, rawUrl, _error, _certificate, callback) => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.username === "riot") {
      event.preventDefault();
      callback(true);
      return;
    }
  } catch (_) {}
  callback(false);
});

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}

let mainWindow = null;
let tray = null;
let lastFocusAppSeq = -1;
let focusPollTimer = null;

function resolveLaunchUrl() {
  const urlArg = process.argv.find((a) => a.startsWith("--url="));
  if (urlArg) {
    const target = urlArg.slice("--url=".length).trim().replace(/^"|"$/g, "");
    if (target) return target;
  }
  const port = process.env.PORT || "3225";
  return `http://127.0.0.1:${port}/AramMayhem/index.html?desktop=1&app=1`;
}

function getWindowStatePayload() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { isMaximized: false, isAlwaysOnTop: false };
  }
  return {
    isMaximized: mainWindow.isMaximized(),
    isAlwaysOnTop: mainWindow.isAlwaysOnTop(),
  };
}

function restoreAndFocusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
  mainWindow.moveTop();
}

function startFocusPolling(targetUrl) {
  let stateEndpoint = "";
  try {
    const u = new URL(targetUrl);
    stateEndpoint = `${u.protocol}//${u.host}/api/mayhem/state`;
  } catch (_) {
    return;
  }
  if (focusPollTimer) clearInterval(focusPollTimer);
  focusPollTimer = setInterval(() => {
    const req = http.get(stateEndpoint, { timeout: 900 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try {
          const obj = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          const seq = Number(obj && obj.focusAppSeq) || 0;
          if (lastFocusAppSeq < 0) {
            lastFocusAppSeq = seq;
          } else if (seq > lastFocusAppSeq) {
            lastFocusAppSeq = seq;
            restoreAndFocusMainWindow();
          }
        } catch (_) {}
      });
    });
    req.on("error", () => {});
    req.on("timeout", () => { try { req.destroy(); } catch (_) {} });
  }, 350);
}

function createMainWindow() {
  const iconPng = path.join(__dirname, "../assets/icon-256.png");
  const iconIco = path.join(__dirname, "../assets/icon.ico");
  const windowIcon = fs.existsSync(iconPng) ? iconPng : iconIco;

  const display = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.min(1420, Math.max(1040, display.width - 60));
  const height = Math.min(850, Math.max(700, display.height - 60));

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 1020,
    minHeight: 680,
    title: "Aram Mayhem",
    icon: windowIcon,
    frame: false,
    backgroundColor: "#0b0f17",
    titleBarStyle: "hidden",
    skipTaskbar: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.once("ready-to-show", () => {
    restoreAndFocusMainWindow();
  });

  mainWindow.on("close", () => {
    if (focusPollTimer) {
      clearInterval(focusPollTimer);
      focusPollTimer = null;
    }
    app.isQuitting = true;
    app.quit();
  });

  const targetUrl = resolveLaunchUrl();
  mainWindow.loadURL(targetUrl).catch(() => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(targetUrl).catch(() => {});
      }
    }, 800);
  });

  mainWindow.webContents.on("did-fail-load", () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(targetUrl).catch(() => {});
      }
    }, 800);
  });

  startFocusPolling(targetUrl);

  // Fallback reveal if ready-to-show took too long
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      restoreAndFocusMainWindow();
    }
  }, 1800);
}

function createStandaloneTray() {
  if (process.argv.includes("--no-tray")) return;
  const trayPath = path.join(__dirname, "../assets/tray-32.png");
  if (!fs.existsSync(trayPath)) return;

  tray = new Tray(nativeImage.createFromPath(trayPath));
  tray.setToolTip("Aram Mayhem");
  tray.on("click", () => {
    restoreAndFocusMainWindow();
  });
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Mở Aram Mayhem",
        click: () => restoreAndFocusMainWindow(),
      },
      {
        label: "Tải lại giao diện",
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reload();
        },
      },
      { type: "separator" },
      {
        label: "Thoát Aram Mayhem",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ])
  );
}

app.on("window-all-closed", () => {
  app.isQuitting = true;
  app.quit();
});

app.on("second-instance", () => {
  restoreAndFocusMainWindow();
});

ipcMain.handle("aram:get-window-state", () => getWindowStatePayload());

ipcMain.handle("aram:window-control", (_event, action) => {
  if (!mainWindow || mainWindow.isDestroyed()) return getWindowStatePayload();
  if (action === "minimize") {
    mainWindow.minimize();
  } else if (action === "maximize") {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  } else if (action === "pin") {
    mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
  } else if (action === "tray") {
    mainWindow.hide();
  } else if (action === "close" || action === "quit") {
    app.isQuitting = true;
    app.quit();
  } else if (action === "reload") {
    mainWindow.webContents.reload();
  } else if (action === "devtools") {
    mainWindow.webContents.toggleDevTools();
  }
  return getWindowStatePayload();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createMainWindow();
  createStandaloneTray();
});
