const { app, BrowserWindow, ipcMain, Menu, clipboard, screen } = require('electron');
const path = require('path');
const { callAI, testAIConnection } = require('./services/aiService');
const { readTextFile } = require('./services/fileService');
const {
  ensureSettingsFile,
  loadSettings,
  getPublicSettings,
  savePublicSettings,
  saveWindowBounds
} = require('./services/settingsService');

const DEFAULT_WINDOW_SIZE = {
  width: 420,
  height: 700
};

let mainWindow;
let saveBoundsTimer = null;

function getWindowOptions(settings) {
  const savedBounds = settings.windowBounds || {};

  return {
    width: savedBounds.width || DEFAULT_WINDOW_SIZE.width,
    height: savedBounds.height || DEFAULT_WINDOW_SIZE.height,
    x: typeof savedBounds.x === 'number' ? savedBounds.x : undefined,
    y: typeof savedBounds.y === 'number' ? savedBounds.y : undefined,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  };
}

function rememberWindowBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  clearTimeout(saveBoundsTimer);
  saveBoundsTimer = setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    saveWindowBounds(mainWindow.getBounds()).catch(() => {});
  }, 400);
}

function getClampedBounds(win, nextBounds = win.getBounds()) {
  const display = screen.getDisplayMatching(nextBounds);
  const area = display.workArea;
  const x = Math.max(area.x, Math.min(area.x + area.width - nextBounds.width, nextBounds.x));
  const y = Math.max(area.y, Math.min(area.y + area.height - nextBounds.height, nextBounds.y));

  return {
    bounds: {
      ...nextBounds,
      x,
      y
    },
    hitLeft: x === area.x,
    hitRight: x === area.x + area.width - nextBounds.width,
    hitTop: y === area.y,
    hitBottom: y === area.y + area.height - nextBounds.height,
    hitEdge: x !== nextBounds.x || y !== nextBounds.y
  };
}

async function createWindow() {
  const settings = await loadSettings();

  // 创建透明、无边框、置顶的桌宠窗口，保留已有桌宠效果。
  mainWindow = new BrowserWindow(getWindowOptions(settings));

  Menu.setApplicationMenu(null);
  mainWindow.loadFile('index.html');

  mainWindow.on('move', rememberWindowBounds);
  mainWindow.on('close', () => {
    saveWindowBounds(mainWindow.getBounds()).catch(() => {});
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function sendMenuAction(action, payload = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('menu:action', {
    action,
    payload
  });
}

function showPetMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: '打开聊天',
      click: () => sendMenuAction('open-chat')
    },
    {
      label: '隐藏 / 显示聊天框',
      click: () => sendMenuAction('toggle-chat')
    },
    {
      label: '设置 AI',
      click: () => sendMenuAction('open-settings')
    },
    {
      label: '切换桌宠状态',
      submenu: [
        { label: '普通', click: () => sendMenuAction('set-state', { state: 'normal' }) },
        { label: '开心', click: () => sendMenuAction('set-state', { state: 'happy' }) },
        { label: '移动', click: () => sendMenuAction('set-state', { state: 'walking' }) },
        { label: '思考', click: () => sendMenuAction('set-state', { state: 'thinking' }) },
        { label: '吃文件', click: () => sendMenuAction('set-state', { state: 'eating' }) },
        { label: '睡觉', click: () => sendMenuAction('set-state', { state: 'sleep' }) },
        { label: '出错', click: () => sendMenuAction('set-state', { state: 'error' }) }
      ]
    },
    {
      label: '趴下睡觉',
      click: () => sendMenuAction('set-state', { state: 'sleep' })
    },
    { type: 'separator' },
    {
      label: '重新加载桌宠',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.reload();
        }
      }
    },
    {
      label: '退出程序',
      click: () => app.quit()
    }
  ]);

  menu.popup({ window: mainWindow });
}

app.whenReady().then(async () => {
  await ensureSettingsFile();
  await createWindow();
});

app.on('window-all-closed', () => {
  // Windows/Linux 下关闭窗口后退出应用。
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  // macOS 点击 Dock 图标时，如果没有窗口就重新创建。
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

ipcMain.on('window:set-ignore-mouse-events', (event, shouldIgnore) => {
  // 透明区域开启鼠标穿透；进入桌宠交互区时关闭穿透。
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) {
    return;
  }

  win.setIgnoreMouseEvents(Boolean(shouldIgnore), { forward: true });
});

ipcMain.handle('window:move-by', (event, delta) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  if (!win || win.isDestroyed()) {
    return {
      ok: false,
      hitEdge: false
    };
  }

  const bounds = win.getBounds();
  const dx = Number(delta?.dx || 0);
  const dy = Number(delta?.dy || 0);
  const result = getClampedBounds(win, {
    ...bounds,
    x: bounds.x + dx,
    y: bounds.y + dy
  });

  win.setBounds(result.bounds);

  return {
    ok: true,
    hitEdge: result.hitEdge,
    hitLeft: result.hitLeft,
    hitRight: result.hitRight,
    hitTop: result.hitTop,
    hitBottom: result.hitBottom
  };
});

ipcMain.handle('window:ensure-visible', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  if (!win || win.isDestroyed()) {
    return {
      ok: false
    };
  }

  const result = getClampedBounds(win);
  win.setBounds(result.bounds);

  return {
    ok: true,
    bounds: result.bounds
  };
});

ipcMain.handle('menu:show', () => {
  showPetMenu();
});

ipcMain.handle('file:read-text', async (event, filePath) => {
  return readTextFile(filePath);
});

ipcMain.handle('ai:call', async (event, prompt) => {
  return callAI(prompt);
});

ipcMain.handle('ai:test', async () => {
  return testAIConnection();
});

ipcMain.handle('settings:get', async () => {
  return getPublicSettings();
});

ipcMain.handle('settings:save', async (event, input) => {
  return savePublicSettings(input);
});

ipcMain.handle('clipboard:write-text', async (event, text) => {
  clipboard.writeText(String(text || ''));
  return {
    ok: true
  };
});
