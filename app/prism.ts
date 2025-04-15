import { loadPrism, type Options } from "@ruby/prism";
import type { ParseResult } from "@ruby/prism/src/deserialize";

let cachedPrism: ((source: string, options?: Options) => ParseResult) | null = null;
let cachedError: Error | null = null;
export async function loadPrismCached(): Promise<(source: string, options?: Options) => ParseResult> {
  if (cachedPrism) {
    return cachedPrism;
  } else if (cachedError) {
    throw cachedError;
  }
  try {
    const prism = await loadPrism();
    cachedPrism ??= prism;
  } catch (e) {
    console.log((e as Error).stack);
    cachedError = e as Error;
    throw e;
  }
  return cachedPrism;
}

export function usePrism(): (source: string, options?: Options) => ParseResult {
  if (cachedPrism) {
    return cachedPrism;
  } else if (cachedError) {
    throw cachedError;
  }
  throw loadPrismCached();
}
