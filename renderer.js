const petStage = document.querySelector('#pet-stage');
const pet = document.querySelector('#pet');
const petImage = document.querySelector('#pet-image');
const bubble = document.querySelector('#bubble');
const talkHotspot = document.querySelector('#talk-hotspot');
const settingsPanel = document.querySelector('#settings-panel');
const closeSettingsPanel = document.querySelector('#close-settings-panel');
const settingsForm = document.querySelector('#settings-form');
const baseUrlInput = document.querySelector('#base-url-input');
const apiKeyInput = document.querySelector('#api-key-input');
const modelInput = document.querySelector('#model-input');
const apiFormatInput = document.querySelector('#api-format-input');
const autoLaunchInput = document.querySelector('#auto-launch-input');
const apiKeyStatus = document.querySelector('#api-key-status');
const testConnection = document.querySelector('#test-connection');
const chatPanel = document.querySelector('#chat-panel');
const chatMessages = document.querySelector('#chat-messages');
const chatForm = document.querySelector('#chat-form');
const chatInput = document.querySelector('#chat-input');
const chatSubmit = document.querySelector('#chat-submit');
const filePanel = document.querySelector('#file-panel');
const closePanel = document.querySelector('#close-panel');
const fileName = document.querySelector('#file-name');
const fileType = document.querySelector('#file-type');
const fileSize = document.querySelector('#file-size');
const fileNote = document.querySelector('#file-note');
const filePreview = document.querySelector('#file-preview');
const fileAnalysis = document.querySelector('#file-analysis');
const copyAnalysis = document.querySelector('#copy-analysis');

const supportedExtensions = new Set([
  '.txt',
  '.md',
  '.js',
  '.java',
  '.py',
  '.html',
  '.css',
  '.json',
  '.sql',
  '.log'
]);

const codeExtensions = new Set(['.js', '.java', '.py']);

// 桌宠状态和图片路径统一放在这里，后续新增状态只需要改这个对象。
const PET_IMAGES = {
  normal: './assets/pet/pet-normal.png',
  normal2: './assets/pet/pet-normal-2.png',
  happy: './assets/pet/pet-happy.png',
  happy2: './assets/pet/pet-happy-2.png',
  thinking: './assets/pet/pet-thinking.png',
  thinking2: './assets/pet/pet-thinking-2.png',
  error: './assets/pet/pet-error.png',
  error2: './assets/pet/pet-error-2.png',
  surprised: './assets/pet/pet-surprised.png',
  surprised2: './assets/pet/pet-surprised-2.png',
  openMouth: './assets/pet/pet-open-mouth.png',
  chewing1: './assets/pet/pet-chewing-1.png',
  chewing2: './assets/pet/pet-chewing-2.png',
  eating: './assets/pet/pet-eating.png',
  walking: './assets/pet/pet-walking-1.png',
  walking2: './assets/pet/pet-walking-2.png'
};

// 用真实图片帧切换做动作，不再依赖 CSS 放大缩小。
const PET_FRAME_ANIMATIONS = {
  normal: { frames: ['normal', 'normal2', 'walking', 'normal2'], interval: 520 },
  happy: { frames: ['happy', 'happy2', 'walking', 'happy2'], interval: 260 },
  walking: { frames: ['walking', 'walking2', 'normal2', 'walking2'], interval: 240 },
  thinking: { frames: ['thinking', 'thinking2', 'thinking', 'normal2'], interval: 360 },
  error: { frames: ['error', 'error2', 'error', 'thinking2'], interval: 280 },
  surprised: { frames: ['surprised', 'surprised2', 'surprised'], interval: 240 }
};

const dailyStates = [
  { state: 'normal', duration: 2600 },
  { state: 'happy', duration: 2400 },
  { state: 'walking', duration: 2200 },
  { state: 'thinking', duration: 3200 }
];

const messages = [
  '嗨！点我干嘛~',
  '今天也要加油哦！',
  '有什么想问我的吗？',
  '你今天过得怎么样？',
  '我随时在你身边哦~',
  '我超喜欢和你聊天的！'
];

let bubbleTimer = null;
let normalTimer = null;
let dailyStateTimer = null;
let dailyStateResetTimer = null;
let petFrameTimer = null;
let dragDepth = 0;
let isCallingAI = false;
let isPetTaskActive = false;
let latestFileAnalysis = '';

function getFileExt(filePath) {
  const lastDotIndex = filePath.lastIndexOf('.');
  return lastDotIndex === -1 ? '' : filePath.slice(lastDotIndex).toLowerCase();
}

function isSupportedFile(filePath) {
  return supportedExtensions.has(getFileExt(filePath));
}

function setPetImage(state) {
  petImage.src = PET_IMAGES[state] || PET_IMAGES.normal;
}

function stopPetFrameAnimation() {
  clearInterval(petFrameTimer);
  petFrameTimer = null;
}

function startPetFrameAnimation(state) {
  const animation = PET_FRAME_ANIMATIONS[state];

  if (!animation || animation.frames.length < 2) {
    return;
  }

  let frameIndex = 0;
  petFrameTimer = setInterval(() => {
    frameIndex = (frameIndex + 1) % animation.frames.length;
    setPetImage(animation.frames[frameIndex]);
  }, animation.interval);
}

function setPetState(state, useFrameAnimation = true) {
  // 所有状态切换都走这个函数，避免各处直接改图片路径。
  const nextState = PET_IMAGES[state] ? state : 'normal';
  pet.dataset.state = nextState;
  stopPetFrameAnimation();
  setPetImage(nextState);

  if (useFrameAnimation) {
    startPetFrameAnimation(nextState);
  }
}

function getRandomDelay(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

function getRandomDailyState() {
  const currentState = pet.dataset.state || 'normal';
  const candidates = dailyStates.filter((item) => item.state !== currentState);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function isPetBusy() {
  return isCallingAI || isPetTaskActive || dragDepth > 0 || normalTimer || pet.classList.contains('is-eating');
}

function clearDailyStateReset() {
  clearTimeout(dailyStateResetTimer);
  dailyStateResetTimer = null;
}

function scheduleDailyStateChange(delay = getRandomDelay(7000, 15000)) {
  clearTimeout(dailyStateTimer);
  dailyStateTimer = setTimeout(() => {
    if (isPetBusy()) {
      scheduleDailyStateChange(2500);
      return;
    }

    const nextState = getRandomDailyState();
    setPetState(nextState.state);

    clearDailyStateReset();
    dailyStateResetTimer = setTimeout(() => {
      setPetState('normal');
      dailyStateResetTimer = null;
      scheduleDailyStateChange();
    }, nextState.duration);
  }, delay);
}

function resetToNormal(delay = 3000) {
  clearTimeout(normalTimer);
  clearTimeout(dailyStateTimer);
  clearDailyStateReset();

  normalTimer = setTimeout(() => {
    setPetState('normal');
    pet.classList.remove('is-eating');
    normalTimer = null;
    scheduleDailyStateChange();
  }, delay);
}

function showBubble(text, duration = 2500) {
  bubble.textContent = text;
  bubble.classList.add('show');

  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => {
    bubble.classList.remove('show');
  }, duration);
}

function showRandomBubble() {
  const text = messages[Math.floor(Math.random() * messages.length)];
  setPetState('happy');
  showBubble(text);
  resetToNormal(1800);
}

function isPointerOnInteractiveArea(event) {
  const target = document.elementFromPoint(event.clientX, event.clientY);

  return Boolean(target?.closest(
    '#pet, .talk-hotspot, .bubble.show, .chat-panel:not([hidden]), .settings-panel:not([hidden]), .file-panel:not([hidden])'
  ));
}

function updateMousePassthrough(shouldIgnore) {
  window.petWindow.setIgnoreMouseEvents(shouldIgnore);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function playEatingAnimation() {
  clearDailyStateReset();
  pet.classList.add('is-eating');

  // 文件投喂动画：发现文件 -> 张嘴 -> 咀嚼 -> 吃掉 -> 开心 -> 待机。
  const eatingFrames = [
    { state: 'surprised', duration: 350 },
    { state: 'surprised2', duration: 220 },
    { state: 'surprised', duration: 220 },
    { state: 'openMouth', duration: 400 },
    { state: 'chewing1', duration: 400 },
    { state: 'chewing2', duration: 400 },
    { state: 'chewing1', duration: 300 },
    { state: 'chewing2', duration: 300 },
    { state: 'eating', duration: 450 },
    { state: 'happy', duration: 500 },
    { state: 'happy2', duration: 260 },
    { state: 'normal', duration: 300 }
  ];

  for (const frame of eatingFrames) {
    setPetState(frame.state, false);
    await wait(frame.duration);
  }

  pet.classList.remove('is-eating');
}

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
}

function appendChatMessage(role, text) {
  const item = document.createElement('div');
  item.className = `chat-message ${role}`;
  item.textContent = text;
  chatMessages.appendChild(item);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return item;
}

function setThinkingMessage(item, text) {
  if (item) {
    item.textContent = text;
  }
}

function setChatVisible(visible) {
  chatPanel.hidden = !visible;

  if (visible) {
    chatInput.focus();
  }
}

function toggleChat() {
  setChatVisible(chatPanel.hidden);
}

function showFileInfo(fileInfo) {
  fileName.textContent = fileInfo.name;
  fileType.textContent = fileInfo.type;
  fileSize.textContent = formatFileSize(fileInfo.size);
  filePreview.textContent = fileInfo.preview;
  fileNote.textContent = fileInfo.isTruncated ? '文件内容较长，已显示前 1000 个字符。' : '';
  filePanel.hidden = false;
}

function setFileAnalysis(text) {
  latestFileAnalysis = text;
  fileAnalysis.textContent = text;
}

function hideFileResult() {
  filePanel.hidden = true;
}

function updateSettingsStatus(hasApiKey) {
  apiKeyStatus.textContent = hasApiKey ? 'API Key 已保存，以后会自动使用。' : '还没有保存 API Key。';
}

async function loadSettingsPanelValues() {
  const config = await window.petWindow.getSettings();

  if (!config.ok) {
    showBubble('读取设置失败');
    return;
  }

  baseUrlInput.value = config.baseUrl;
  modelInput.value = config.model;
  apiFormatInput.value = config.apiFormat || 'anthropic_messages';
  autoLaunchInput.checked = Boolean(config.autoLaunch);
  apiKeyInput.value = '';
  updateSettingsStatus(config.hasApiKey);
}

async function openSettingsPanel() {
  await loadSettingsPanelValues();
  settingsPanel.hidden = false;
  apiKeyInput.focus();
}

function closeSettings() {
  apiKeyInput.value = '';
  settingsPanel.hidden = true;
}

async function askAI(prompt, thinkingText = '思考中……') {
  if (isCallingAI) {
    showBubble('我还在思考上一个问题哦');
    return {
      ok: false,
      text: '我还在思考上一个问题哦'
    };
  }

  isCallingAI = true;
  chatSubmit.disabled = true;
  clearTimeout(dailyStateTimer);
  clearDailyStateReset();
  setPetState('thinking');
  showBubble('我想一想……', 4000);

  const result = await window.petWindow.callAI(prompt);

  isCallingAI = false;
  chatSubmit.disabled = false;

  if (!result.ok) {
    setPetState('error');
    showBubble(result.text);
    resetToNormal();
    return result;
  }

  setPetState('happy');
  showBubble('我想好啦！');
  resetToNormal(5000);
  return result;
}

function buildFilePrompt(fileInfo) {
  const action = codeExtensions.has(fileInfo.type)
    ? '请解释这段代码的主要功能、关键逻辑和可能需要注意的问题。'
    : '请总结这个文件的主要内容，并列出重点。';

  return [
    `文件名：${fileInfo.name}`,
    `文件类型：${fileInfo.type}`,
    '',
    action,
    '',
    '文件内容：',
    fileInfo.content
  ].join('\n');
}

function getFirstDroppedFile(event) {
  const files = Array.from(event.dataTransfer.files);
  return files[0];
}

function getDroppedFilePath(file) {
  // Electron 的拖拽文件对象会带 path；普通浏览器环境没有这个字段。
  return file && file.path ? file.path : '';
}

async function handleDroppedFiles(event) {
  const file = getFirstDroppedFile(event);
  const filePath = getDroppedFilePath(file);

  if (!filePath) {
    setPetState('error');
    showBubble('没有找到文件');
    resetToNormal();
    return;
  }

  if (!isSupportedFile(filePath)) {
    setPetState('error');
    showBubble('这个文件我现在还吃不动');
    resetToNormal();
    return;
  }

  hideFileResult();
  setFileAnalysis('');
  filePanel.hidden = false;
  fileName.textContent = file.name || filePath;
  fileType.textContent = getFileExt(filePath);
  fileSize.textContent = '-';
  filePreview.textContent = '';
  fileNote.textContent = '已收到文件，准备投喂。';
  setFileAnalysis('等待分析结果……');
  showBubble(`收到文件：${file.name || '本地文件'}`);

  await playEatingAnimation();

  showBubble('正在读取文件……', 3000);
  fileNote.textContent = '正在读取文件……';
  const result = await window.petWindow.readTextFile(filePath);

  if (!result.ok) {
    setPetState('error');
    showBubble(result.message || '文件读取失败');
    fileNote.textContent = result.message || '文件读取失败';
    setFileAnalysis(result.message || '文件读取失败');
    resetToNormal();
    return;
  }

  showFileInfo(result.fileInfo);
  showBubble('正在分析文件……', 4000);
  setFileAnalysis('正在分析文件……');

  const aiResult = await askAI(buildFilePrompt(result.fileInfo), '正在分析文件……');

  if (!aiResult.ok) {
    setFileAnalysis(aiResult.text);
    return;
  }

  setFileAnalysis(aiResult.text);
}

function markDragging(isDragging) {
  petStage.classList.toggle('is-dragging-file', isDragging);

  if (isDragging) {
    setPetState('surprised');
    showBubble('发现文件啦！', 4000);
  }
}

function handleMenuAction(data) {
  const action = data?.action;
  const payload = data?.payload || {};

  if (action === 'open-chat') {
    setChatVisible(true);
  }

  if (action === 'toggle-chat') {
    toggleChat();
  }

  if (action === 'open-settings') {
    openSettingsPanel();
  }

  if (action === 'set-state') {
    clearDailyStateReset();
    setPetState(payload.state || 'normal');
    resetToNormal(3000);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  // 原生拖动必须让窗口接收鼠标事件，否则 -webkit-app-region: drag 会失效。
  updateMousePassthrough(true);
  setPetState('normal');
  scheduleDailyStateChange(3500);
  appendChatMessage('ai', '你好，我是 CodePet。可以聊天，也可以把文本或代码文件拖给我分析。');
  await loadSettingsPanelValues();
});

window.petWindow.onMenuAction(handleMenuAction);

window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  window.petWindow.showContextMenu();
});

window.addEventListener('mousemove', (event) => {
  updateMousePassthrough(!isPointerOnInteractiveArea(event));
});

window.addEventListener('mouseleave', () => {
  updateMousePassthrough(true);
});

talkHotspot.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  showRandomBubble();
});

closeSettingsPanel.addEventListener('click', () => {
  closeSettings();
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  isPetTaskActive = true;
  clearTimeout(dailyStateTimer);
  clearDailyStateReset();

  const result = await window.petWindow.saveSettings({
    baseUrl: baseUrlInput.value,
    authToken: apiKeyInput.value,
    model: modelInput.value,
    apiFormat: apiFormatInput.value,
    autoLaunch: autoLaunchInput.checked
  });

  apiKeyInput.value = '';
  isPetTaskActive = false;

  if (!result.ok) {
    setPetState('error');
    showBubble(result.message);
    resetToNormal();
    return;
  }

  setPetState('happy');
  updateSettingsStatus(result.config.hasApiKey);
  showBubble(result.message);
  resetToNormal(2500);
});

testConnection.addEventListener('click', async () => {
  testConnection.disabled = true;
  isPetTaskActive = true;
  clearTimeout(dailyStateTimer);
  clearDailyStateReset();
  setPetState('thinking');
  showBubble('正在测试连接……', 4000);

  const result = await window.petWindow.testAIConnection();

  testConnection.disabled = false;
  isPetTaskActive = false;

  if (!result.ok) {
    setPetState('error');
    showBubble(result.text, 4000);
    resetToNormal();
    return;
  }

  setPetState('happy');
  showBubble('AI 连接正常');
  resetToNormal(2500);
});

chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const prompt = chatInput.value.trim();

  if (!prompt) {
    showBubble('先输入一个问题吧');
    return;
  }

  chatInput.value = '';
  appendChatMessage('user', prompt);
  const thinkingMessage = appendChatMessage('ai pending', '思考中……');
  const result = await askAI(prompt, '我想一想……');
  setThinkingMessage(thinkingMessage, result.text);
});

closePanel.addEventListener('click', () => {
  hideFileResult();
});

copyAnalysis.addEventListener('click', async () => {
  if (!latestFileAnalysis) {
    showBubble('还没有可复制的分析结果');
    return;
  }

  await window.petWindow.writeClipboardText(latestFileAnalysis);
  showBubble('分析结果已复制');
});

window.addEventListener('dragenter', (event) => {
  event.preventDefault();
  dragDepth += 1;
  markDragging(true);
});

window.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
});

window.addEventListener('dragleave', (event) => {
  event.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);

  if (dragDepth === 0) {
    markDragging(false);
  }
});

window.addEventListener('drop', async (event) => {
  event.preventDefault();
  dragDepth = 0;
  markDragging(false);
  isPetTaskActive = true;

  try {
    await handleDroppedFiles(event);
  } finally {
    isPetTaskActive = false;

    if (!normalTimer) {
      scheduleDailyStateChange();
    }
  }
});
