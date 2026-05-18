const fs = require('fs/promises');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const SETTINGS_PATH = path.join(CONFIG_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  env: {
    ANTHROPIC_BASE_URL: 'https://api.code-relay.com/',
    ANTHROPIC_AUTH_TOKEN: ''
  },
  model: 'claude-3-5-sonnet-latest',
  apiFormat: 'anthropic_messages',
  requestTimeoutMs: 30000,
  autoLaunch: false,
  windowBounds: null
};

const API_FORMATS = new Set([
  'anthropic_messages',
  'openai_responses',
  'openai_chat'
]);

async function ensureSettingsFile() {
  await fs.mkdir(CONFIG_DIR, { recursive: true });

  try {
    await fs.access(SETTINGS_PATH);
  } catch (error) {
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
  }
}

function normalizeSettings(settings) {
  const inferredApiFormat = inferApiFormat(settings);
  const apiFormat = String(settings?.apiFormat || inferredApiFormat);
  const requestTimeoutMs = Number(settings?.requestTimeoutMs || DEFAULT_SETTINGS.requestTimeoutMs);

  return {
    env: {
      ANTHROPIC_BASE_URL: String(settings?.env?.ANTHROPIC_BASE_URL || DEFAULT_SETTINGS.env.ANTHROPIC_BASE_URL),
      ANTHROPIC_AUTH_TOKEN: String(settings?.env?.ANTHROPIC_AUTH_TOKEN || '')
    },
    model: String(settings?.model || DEFAULT_SETTINGS.model),
    apiFormat: API_FORMATS.has(apiFormat) ? apiFormat : DEFAULT_SETTINGS.apiFormat,
    requestTimeoutMs: Number.isFinite(requestTimeoutMs) ? requestTimeoutMs : DEFAULT_SETTINGS.requestTimeoutMs,
    autoLaunch: Boolean(settings?.autoLaunch),
    windowBounds: settings?.windowBounds || null
  };
}

function inferApiFormat(settings) {
  const baseUrl = String(settings?.env?.ANTHROPIC_BASE_URL || '').toLowerCase();
  const model = String(settings?.model || '').toLowerCase();

  if (baseUrl.includes('anthropic') || baseUrl.includes('code-relay') || model.includes('claude')) {
    return 'anthropic_messages';
  }

  return 'openai_responses';
}

async function loadSettings() {
  await ensureSettingsFile();

  try {
    const rawSettings = await fs.readFile(SETTINGS_PATH, 'utf-8');
    return normalizeSettings(JSON.parse(rawSettings));
  } catch (error) {
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
    return normalizeSettings(DEFAULT_SETTINGS);
  }
}

async function saveSettings(settings) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  const nextSettings = normalizeSettings(settings);
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(nextSettings, null, 2), 'utf-8');
  return nextSettings;
}

async function getPublicSettings() {
  const settings = await loadSettings();

  return {
    ok: true,
    baseUrl: settings.env.ANTHROPIC_BASE_URL,
    model: settings.model,
    apiFormat: settings.apiFormat,
    autoLaunch: settings.autoLaunch,
    hasApiKey: Boolean(settings.env.ANTHROPIC_AUTH_TOKEN)
  };
}

async function savePublicSettings(input) {
  const currentSettings = await loadSettings();
  const baseUrl = String(input?.baseUrl || '').trim();
  const authToken = String(input?.authToken || '').trim();
  const model = String(input?.model || '').trim();
  const apiFormat = String(input?.apiFormat || currentSettings.apiFormat);

  if (!baseUrl) {
    return {
      ok: false,
      message: '请先设置 AI 接口地址'
    };
  }

  if (!model) {
    return {
      ok: false,
      message: '请先设置模型名称'
    };
  }

  if (!API_FORMATS.has(apiFormat)) {
    return {
      ok: false,
      message: '接口格式不支持'
    };
  }

  const nextSettings = await saveSettings({
    ...currentSettings,
    env: {
      ANTHROPIC_BASE_URL: baseUrl,
      ANTHROPIC_AUTH_TOKEN: authToken || currentSettings.env.ANTHROPIC_AUTH_TOKEN || ''
    },
    model,
    apiFormat,
    autoLaunch: Boolean(input?.autoLaunch)
  });

  return {
    ok: true,
    message: nextSettings.env.ANTHROPIC_AUTH_TOKEN ? 'AI 设置已保存' : '设置已保存，但还没有 API Key',
    config: {
      baseUrl: nextSettings.env.ANTHROPIC_BASE_URL,
      model: nextSettings.model,
      apiFormat: nextSettings.apiFormat,
      autoLaunch: nextSettings.autoLaunch,
      hasApiKey: Boolean(nextSettings.env.ANTHROPIC_AUTH_TOKEN)
    }
  };
}

async function saveWindowBounds(bounds) {
  if (!bounds || typeof bounds.x !== 'number' || typeof bounds.y !== 'number') {
    return;
  }

  const settings = await loadSettings();
  await saveSettings({
    ...settings,
    windowBounds: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    }
  });
}

module.exports = {
  SETTINGS_PATH,
  DEFAULT_SETTINGS,
  ensureSettingsFile,
  loadSettings,
  saveSettings,
  getPublicSettings,
  savePublicSettings,
  saveWindowBounds
};
