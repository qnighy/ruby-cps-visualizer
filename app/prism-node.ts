import { WASI } from "wasi";
import type { Options } from "@ruby/prism";
import type { ParseResult } from "@ruby/prism/src/deserialize";
import { parsePrism } from "@ruby/prism/src/parsePrism.js";
import prismWasmDataURL from "@ruby/prism/src/prism.wasm?inline";

export async function loadPrism(): Promise<(source: string, options?: Options) => ParseResult> {
  const wasm = await WebAssembly.compileStreaming(fetch(prismWasmDataURL));
  const wasi = new WASI({ version: "preview1" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance = await WebAssembly.instantiate(wasm, wasi.getImportObject() as any);
  wasi.initialize(instance);

  return function (source, options = {}) {
    return parsePrism(instance.exports, source, options);
  }
}

export * from "@ruby/prism/src/visitor.js";
export * from "@ruby/prism/src/nodes.js";
