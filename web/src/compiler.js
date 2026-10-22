const REQUEST_TIMEOUT = 180_000;
const pending = new Map();
const initializationListeners = new Set();
let worker;
let initialization;
let nextId = 1;

function report(callback, message) {
  if (typeof callback !== 'function') return;
  // A UI progress callback must not leave a successful compilation unresolved.
  try { callback(message); } catch (error) { console.error(error); }
}

function failWorker(error, failedWorker = worker) {
  if (worker !== failedWorker) return;
  worker?.terminate();
  worker = undefined;
  initialization = undefined;
  for (const request of pending.values()) {
    clearTimeout(request.timeout);
    request.reject(error);
  }
  pending.clear();
}

function send(target, message, onProgress) {
  if (target !== worker) return Promise.reject(new Error('排版引擎已重新启动，请再试一次。'));
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timeout = setTimeout(() => {
      failWorker(new Error('生成时间过长，请检查网络、减少内容或图片大小后重试。'), target);
    }, REQUEST_TIMEOUT);
    pending.set(id, { resolve, reject, onProgress, timeout });
    try {
      // Keep the caller's upload buffers intact for theme changes and later edits.
      target.postMessage({ ...message, id });
    } catch (error) {
      clearTimeout(timeout);
      pending.delete(id);
      reject(new Error(`无法发送排版内容：${error.message}`));
    }
  });
}

async function readyWorker(onProgress) {
  if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
    throw new Error('当前浏览器不支持本地排版，请使用新版 Chrome、Edge、Firefox 或 Safari。');
  }
  initializationListeners.add(onProgress);
  try {
    if (!worker) {
      const created = new Worker(new URL('./compiler-worker.js', import.meta.url), { type: 'module' });
      worker = created;
      created.addEventListener('message', ({ data }) => {
        if (worker !== created) return;
        const request = pending.get(data.id);
        if (!request) return;
        if (data.type === 'progress') {
          report(request.onProgress, data.message);
          return;
        }
        clearTimeout(request.timeout);
        pending.delete(data.id);
        if (data.type === 'error') {
          request.reject(new Error(data.error?.message || '排版失败，请重试。'));
        } else if (data.type === 'ready') {
          request.resolve(created);
        } else if (data.type === 'result') {
          request.resolve({ svg: data.svg, pdf: data.pdf });
        } else {
          request.reject(new Error('排版引擎返回了无法识别的结果。'));
        }
      });
      created.addEventListener('error', (event) => {
        event.preventDefault();
        failWorker(new Error(`本地排版引擎启动或运行失败：${event.message || '请刷新页面后重试。'}`), created);
      });
      created.addEventListener('messageerror', () => {
        failWorker(new Error('无法读取排版结果，请刷新页面后重试。'), created);
      });
      // init -> ready is completed before the first compile request is posted.
      initialization = send(created, {
        type: 'init', baseURL: new URL(import.meta.env.BASE_URL, window.location.href).href,
      }, (message) => {
        for (const callback of initializationListeners) report(callback, message);
      }).catch((error) => {
        failWorker(error, created);
        throw error;
      });
    }
    return await initialization;
  } finally {
    initializationListeners.delete(onProgress);
  }
}

/**
 * Compile the selected local template without sending profile or image data to a server.
 * @param {{kind: 'resume'|'strip', theme: 'dark'|'light', profile: object,
 *   images?: {portrait?: {data: Uint8Array, extension: 'png'|'jpg'},
 *   qr_image?: {data: Uint8Array, extension: 'png'|'jpg'}}}} document
 * @param {(message: string) => void} [onProgress]
 * @returns {Promise<{svg: string, pdf: Uint8Array}>}
 */
export async function compileDocument(document, onProgress) {
  const target = await readyWorker(onProgress);
  report(onProgress, '正在准备排版…');
  return send(target, { type: 'compile', payload: document }, onProgress);
}
