const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("__PASSION_BLITZ__", {
  isBlitzElectron: true,
  windowControl: (action) => ipcRenderer.invoke("passion:window-control", action),
  getWindowState: () => ipcRenderer.invoke("passion:get-window-state"),
});
