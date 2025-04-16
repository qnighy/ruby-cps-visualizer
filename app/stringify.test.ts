import { loadPrism, type Options } from "@ruby/prism";
import { describe, expect, it } from "vitest";
import { stringifyProgram } from "./stringify";

const parse = await loadPrism();

function restringify(source: string, options: Options = {}): string {
  const {
    filepath,
    line,
    encoding,
    frozen_string_literal,
    command_line,
    version,
    main_script,
    partial_script,
    scopes,
  } = options;
  const result = parse(source, {
    filepath,
    line,
    encoding,
    frozen_string_literal,
    command_line,
    version,
    main_script,
    partial_script,
    scopes,
  });
  for (const error of result.errors) {
    throw new SyntaxError(error.message);
  }
  return stringifyProgram(result.value);
}

describe("stringifyProgram", () => {
  describe("primary expressions", () => {
    it("stringifies self", () => {
      expect(restringify("self")).toBe("self\n");
    });
    it("stringifies __LINE__", () => {
      expect(restringify("__LINE__")).toBe("__LINE__\n");
    });
    it("stringifies __FILE__", () => {
      expect(restringify("__FILE__")).toBe("__FILE__\n");
    });
    it("stringifies __ENCODING__", () => {
      expect(restringify("__ENCODING__")).toBe("__ENCODING__\n");
    });
    it("stringifies true", () => {
      expect(restringify("true")).toBe("true\n");
    });
    it("stringifies false", () => {
      expect(restringify("false")).toBe("false\n");
    });
    it("stringifies nil", () => {
      expect(restringify("nil")).toBe("nil\n");
    });
    it("stringifies integers", () => {
      expect(restringify("42")).toBe("42\n");
      expect(restringify("-42")).toBe("-42\n");
      expect(restringify("0")).toBe("0\n");
    });
    it("stringifies local variables", () => {
      expect(restringify("a", { scopes: [["a"]] })).toBe("a\n");
    });
  });
});
