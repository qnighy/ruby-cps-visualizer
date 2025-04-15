import { WASI } from "@bjorn3/browser_wasi_shim";
import { parsePrism } from "@ruby/prism/src/parsePrism.js";
import prismWasmPath from "@ruby/prism/src/prism.wasm?raw";

const wasm = await WebAssembly.compileStreaming(fetch(prismWasmPath));

const wasi = new WASI([], [], []);
const instance = await WebAssembly.instantiate(wasm, { wasi_snapshot_preview1: wasi.wasiImport });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
wasi.initialize(instance as any);

export function parse(source: string, options: Parameters<typeof parsePrism>[2] = {}): ReturnType<typeof parsePrism> {
  return parsePrism(instance.exports, source, options);
}
