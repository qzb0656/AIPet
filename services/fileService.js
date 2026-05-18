const fs = require('fs/promises');
const path = require('path');

const MAX_FILE_SIZE = 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([
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

function getFileExt(filePath) {
  return path.extname(filePath).toLowerCase();
}

function isSupportedFile(filePath) {
  return SUPPORTED_EXTENSIONS.has(getFileExt(filePath));
}

function createErrorResult(message) {
  return {
    ok: false,
    message
  };
}

async function readTextFile(filePath) {
  // 本地文件读取放在主进程，渲染进程不会直接获得 Node 能力。
  if (!filePath || typeof filePath !== 'string') {
    return createErrorResult('没有找到文件');
  }

  if (!isSupportedFile(filePath)) {
    return createErrorResult('这个文件我现在还吃不动');
  }

  try {
    const stat = await fs.stat(filePath);

    if (!stat.isFile()) {
      return createErrorResult('这个文件我现在还吃不动');
    }

    if (stat.size > MAX_FILE_SIZE) {
      return createErrorResult('这个文件太大了，我现在吃不下');
    }

    if (stat.size === 0) {
      return createErrorResult('这个文件是空的');
    }

    const content = await fs.readFile(filePath, 'utf-8');

    if (content.length === 0) {
      return createErrorResult('这个文件是空的');
    }

    return {
      ok: true,
      fileInfo: {
        name: path.basename(filePath),
        type: getFileExt(filePath),
        size: stat.size,
        content,
        preview: content.slice(0, 1000),
        isTruncated: content.length > 1000
      }
    };
  } catch (error) {
    return createErrorResult('文件读取失败');
  }
}

module.exports = {
  SUPPORTED_EXTENSIONS,
  readTextFile
};
