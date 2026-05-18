const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petWindow', {
  // 只暴露窗口交互需要的安全接口，不开放 Node 能力。
  setIgnoreMouseEvents: (shouldIgnore) => {
    ipcRenderer.send('window:set-ignore-mouse-events', shouldIgnore);
  },

  moveWindowBy: (delta) => {
    return ipcRenderer.invoke('window:move-by', delta);
  },

  ensureWindowVisible: () => {
    return ipcRenderer.invoke('window:ensure-visible');
  },

  showContextMenu: () => {
    return ipcRenderer.invoke('menu:show');
  },

  onMenuAction: (callback) => {
    ipcRenderer.on('menu:action', (event, data) => {
      callback(data);
    });
  },

  readTextFile: (filePath) => {
    return ipcRenderer.invoke('file:read-text', filePath);
  },

  callAI: (prompt) => {
    return ipcRenderer.invoke('ai:call', prompt);
  },

  testAIConnection: () => {
    return ipcRenderer.invoke('ai:test');
  },

  getSettings: () => {
    return ipcRenderer.invoke('settings:get');
  },

  saveSettings: (input) => {
    return ipcRenderer.invoke('settings:save', input);
  },

  writeClipboardText: (text) => {
    return ipcRenderer.invoke('clipboard:write-text', text);
  }
});
