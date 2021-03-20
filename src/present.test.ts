import { State } from "./state";
import { AnalysisResultTypeEnum } from "./analyzer";
import { present } from "./presenter";

describe("present", () => {
  describe("when given state with unused exports", () => {
    const state = new State();

    [
      {
        type: AnalysisResultTypeEnum.POTENTIALLY_UNUSED,
        symbols: [{ name: "foo", start: { line: 0, column: 0 }, end : { line: 0, column: 0 }, usedInModule: false }],
        file: "foo.ts",
      },
      {
        type: AnalysisResultTypeEnum.POTENTIALLY_UNUSED,
        symbols: [{ name: "bar", start: { line: 0, column: 0 }, end : { line: 0, column: 0 }, usedInModule: false }],
        file: "bar.ts",
      },
    ].forEach((result) => state.onResult(result));

    it("should produce a presentable output", () => {
      expect(JSON.stringify(present(state))).toMatchInlineSnapshot(
        `"[\\"foo.ts:0 - foo\\",\\"bar.ts:0 - bar\\"]"`
      );
    });
  });

  describe("when given state with no unused exports", () => {
    const state = new State();

    [
      {
        type: AnalysisResultTypeEnum.POTENTIALLY_UNUSED,
        symbols: [{ name: "foo", start: { line: 0, column: 0 }, end : { line: 0, column: 0 }, usedInModule: false }],
        file: "foo.ts",
      },
      {
        type: AnalysisResultTypeEnum.DEFINITELY_USED,
        symbols: [{ name: "foo", start: { line: 0, column: 0 }, end : { line: 0, column: 0 }, usedInModule: false }],
        file: "foo.ts",
      },
    ].forEach((result) => state.onResult(result));

    it("should produce an empty output", () => {
      expect(JSON.stringify(present(state))).toBe(JSON.stringify([]));
    });
  });

  describe("when given state with exports used in own module", () => {
    const state = new State();

    [
      {
        type: AnalysisResultTypeEnum.POTENTIALLY_UNUSED,
        symbols: [{ name: "foo", start: { line: 0, column: 0 }, end : { line: 0, column: 0 }, usedInModule: true }],
        file: "foo.ts",
      },
      {
        type: AnalysisResultTypeEnum.POTENTIALLY_UNUSED,
        symbols: [{ name: "bar", start: { line: 0, column: 0 }, end : { line: 0, column: 0 }, usedInModule: false }],
        file: "bar.ts",
      },
    ].forEach((result) => state.onResult(result));

    it("should produce a presentable output", () => {
      expect(JSON.stringify(present(state))).toMatchInlineSnapshot(
        `"[\\"foo.ts:0 - foo (used in module)\\",\\"bar.ts:0 - bar\\"]"`
      );
    });
  });
});
