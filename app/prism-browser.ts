import { WASI } from "@bjorn3/browser_wasi_shim";
import type { Options } from "@ruby/prism";
import type { ParseResult } from "@ruby/prism/src/deserialize";
import { parsePrism } from "@ruby/prism/src/parsePrism.js";
import prismWasmDataURL from "@ruby/prism/src/prism.wasm?inline";

export async function loadPrism(): Promise<(source: string, options?: Options) => ParseResult> {
  const wasm = await WebAssembly.compileStreaming(fetch(prismWasmDataURL));

  const wasi = new WASI([], [], []);
  const instance = await WebAssembly.instantiate(wasm, { wasi_snapshot_preview1: wasi.wasiImport });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wasi.initialize(instance as any);

  return function parse(source: string, options: Parameters<typeof parsePrism>[2] = {}): ReturnType<typeof parsePrism> {
    return parsePrism(instance.exports, source, options);
  };
}

export * from "@ruby/prism/src/visitor.js";
export * from "@ruby/prism/src/nodes.js";
