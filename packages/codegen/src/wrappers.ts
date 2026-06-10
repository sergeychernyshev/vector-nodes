/**
 * Synchronous main-thread wrapper: re-exports the generated default function for
 * direct import and call.
 */
export function mainThreadWrapper(moduleSpecifier: string): string {
  return `// Synchronous main-thread wrapper.\nexport { default } from '${moduleSpecifier}';\n`;
}

/**
 * Web Worker module that runs the generated function off the main thread,
 * answering `{ id, args }` requests with `{ id, result }` (or `{ id, error }`).
 */
export function workerModule(moduleSpecifier: string): string {
  return `import fn from '${moduleSpecifier}';

self.onmessage = (event) => {
  const { id, args } = event.data;
  try {
    self.postMessage({ id, result: fn(...args) });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
`;
}

/**
 * Comlink-style async client for {@link workerModule}: a same-name/args function
 * that returns a Promise of the result, run in the worker.
 */
export function workerClient(name: string, workerSpecifier: string): string {
  return `let _seq = 0;
const _pending = new Map();
const _worker = new Worker(new URL('${workerSpecifier}', import.meta.url), { type: 'module' });
_worker.onmessage = (event) => {
  const { id, result, error } = event.data;
  const pending = _pending.get(id);
  if (!pending) return;
  _pending.delete(id);
  if (error) pending.reject(new Error(error));
  else pending.resolve(result);
};

/** Async wrapper: runs ${name}() in a Web Worker. */
export default function ${name}(...args) {
  const id = ++_seq;
  return new Promise((resolve, reject) => {
    _pending.set(id, { resolve, reject });
    _worker.postMessage({ id, args });
  });
}
`;
}
