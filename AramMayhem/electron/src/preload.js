const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("__ARAM_MAYHEM__", {
  isDesktopElectron: true,
  windowControl: (action) => ipcRenderer.invoke("aram:window-control", action),
  getWindowState: () => ipcRenderer.invoke("aram:get-window-state"),
});
