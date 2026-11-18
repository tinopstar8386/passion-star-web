const path = require("path");
const fs = require("fs");
const http = require("http");
const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, screen } = require("electron");

app.setAppUserModelId("com.passionstar.mayhemblitz");

try {
  app.setPath("userData", path.join(app.getPath("appData"), "PassionMayhemBlitz"));
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

function resolveLaunchUrl() {
  const urlArg = process.argv.find((a) => a.startsWith("--url="));
  if (urlArg) {
    const target = urlArg.slice("--url=".length).trim().replace(/^"|"$/g, "");
    if (target) return target;
  }
  const port = process.env.PORT || "3225";
  return `http://127.0.0.1:${port}/aram-mayhem.html?desktop=1&blitz=1`;
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

function createMainWindow() {
  const iconPng = path.join(__dirname, "../assets/icons/256x256.png");
  const iconIco = path.join(__dirname, "../assets/icons/icon.ico");
  const windowIcon = fs.existsSync(iconPng) ? iconPng : iconIco;

  const display = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.min(1420, Math.max(1040, display.width - 60));
  const height = Math.min(850, Math.max(700, display.height - 60));

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 1020,
    minHeight: 680,
    title: "Passion Mayhem Blitz",
    icon: windowIcon,
    frame: false,
    backgroundColor: "#0C0E13",
    titleBarStyle: "hidden",
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on("close", (event) => {
    if (!app.isQuitting && !process.argv.includes("--quit-on-close")) {
      event.preventDefault();
      mainWindow.hide();
    }
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

  // Fallback reveal if ready-to-show took too long
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 2000);
}

function createStandaloneTray() {
  if (process.argv.includes("--no-tray")) return;
  const trayPath = path.join(__dirname, "../assets/icons/tray32x32.png");
  if (!fs.existsSync(trayPath)) return;

  tray = new Tray(nativeImage.createFromPath(trayPath));
  tray.setToolTip("Passion Mayhem Blitz");
  tray.on("click", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
      mainWindow.hide();
    } else {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Mở Passion Mayhem Blitz",
        click: () => {
          if (!mainWindow || mainWindow.isDestroyed()) return;
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        },
      },
      {
        label: "Tải lại giao diện",
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reload();
        },
      },
      { type: "separator" },
      {
        label: "Thoát",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ])
  );
}

app.on("window-all-closed", (e) => {
  e.preventDefault();
});

app.on("second-instance", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

ipcMain.handle("passion:get-window-state", () => getWindowStatePayload());

ipcMain.handle("passion:window-control", (_event, action) => {
  if (!mainWindow || mainWindow.isDestroyed()) return getWindowStatePayload();
  if (action === "minimize") {
    mainWindow.minimize();
  } else if (action === "maximize") {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  } else if (action === "pin") {
    mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
  } else if (action === "close" || action === "hide") {
    mainWindow.hide();
  } else if (action === "reload") {
    mainWindow.webContents.reload();
  } else if (action === "devtools") {
    mainWindow.webContents.toggleDevTools();
  } else if (action === "quit") {
    app.isQuitting = true;
    app.quit();
  }
  return getWindowStatePayload();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createMainWindow();
  createStandaloneTray();
});
