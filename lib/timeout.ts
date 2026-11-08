// Gives up on a slow call so a sleeping service shows a clear message instead of a timeout page.
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | "timeout"> {
  return Promise.race([p, new Promise<"timeout">((r) => setTimeout(() => r("timeout"), ms))]);
}
