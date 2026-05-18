const { loadSettings } = require('./settingsService');

function createAIResult(ok, text) {
  return {
    ok,
    text
  };
}

function buildUrl(baseUrl, endpoint) {
  return `${baseUrl.replace(/\/+$/, '')}${endpoint}`;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function mapHttpError(status) {
  if (status === 401 || status === 403) {
    return 'API Key 可能无效，请检查设置';
  }

  if (status === 402 || status === 429) {
    return 'AI 请求被拒绝，请检查额度或接口权限';
  }

  if (status >= 500) {
    return 'AI 服务暂时不可用，请稍后再试';
  }

  return 'AI 请求失败，请检查接口地址、模型名称或接口格式';
}

async function fetchJsonWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonWithRetry(url, options, timeoutMs) {
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchJsonWithTimeout(url, options, timeoutMs);

      if (response.ok || (response.status < 500 && response.status !== 408 && response.status !== 429)) {
        return response;
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt === 0) {
      await wait(800);
    }
  }

  throw lastError;
}

function extractAnthropicText(data) {
  if (!Array.isArray(data?.content)) {
    return '';
  }

  return data.content
    .filter((item) => item && item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

function extractResponsesText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data?.output)) {
    return '';
  }

  return data.output
    .flatMap((item) => Array.isArray(item?.content) ? item.content : [])
    .filter((content) => typeof content?.text === 'string')
    .map((content) => content.text)
    .join('\n')
    .trim();
}

function extractChatText(data) {
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === 'string' ? text.trim() : '';
}

function createRequest(settings, prompt) {
  const baseUrl = settings.env.ANTHROPIC_BASE_URL.trim();
  const authToken = settings.env.ANTHROPIC_AUTH_TOKEN.trim();
  const model = settings.model.trim();

  if (settings.apiFormat === 'openai_responses') {
    return {
      url: buildUrl(baseUrl, '/v1/responses'),
      extractText: extractResponsesText,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          model,
          input: prompt,
          max_output_tokens: 1000
        })
      }
    };
  }

  if (settings.apiFormat === 'openai_chat') {
    return {
      url: buildUrl(baseUrl, '/v1/chat/completions'),
      extractText: extractChatText,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          model,
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      }
    };
  }

  return {
    url: buildUrl(baseUrl, '/v1/messages'),
    extractText: extractAnthropicText,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': authToken,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    }
  };
}

async function callAI(prompt) {
  const cleanPrompt = String(prompt || '').trim();

  if (!cleanPrompt) {
    return createAIResult(false, '请输入想问的问题');
  }

  const settings = await loadSettings();
  const baseUrl = settings.env.ANTHROPIC_BASE_URL.trim();
  const authToken = settings.env.ANTHROPIC_AUTH_TOKEN.trim();
  const model = settings.model.trim();

  if (!baseUrl) {
    return createAIResult(false, '请先设置 AI 接口地址');
  }

  if (!authToken) {
    return createAIResult(false, '请先设置 API Key');
  }

  if (!model) {
    return createAIResult(false, '请先设置模型名称');
  }

  try {
    const request = createRequest(settings, cleanPrompt);
    const response = await fetchJsonWithRetry(request.url, request.options, settings.requestTimeoutMs);

    if (!response.ok) {
      return createAIResult(false, mapHttpError(response.status));
    }

    const data = await response.json();
    const text = request.extractText(data);

    if (!text) {
      return createAIResult(false, 'AI 返回格式异常，请检查接口格式是否选对');
    }

    return createAIResult(true, text);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return createAIResult(false, 'AI 请求超时，请检查网络或接口地址');
    }

    return createAIResult(false, '我连接不上 AI，检查一下网络或 API 设置吧');
  }
}

async function testAIConnection() {
  return callAI('请只回复两个字：正常');
}

module.exports = {
  callAI,
  testAIConnection
};
