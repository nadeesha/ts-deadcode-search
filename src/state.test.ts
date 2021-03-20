import { State } from "./state";
import { AnalysisResultTypeEnum } from "./analyzer";

describe("State", () => {
  describe("when given state with unused exports", () => {
    const state = new State();

    [
      {
        type: AnalysisResultTypeEnum.POTENTIALLY_UNUSED,
        symbols: [{ name: "foo", start: { line: 0, column: 0 }, end : { line: 0, column: 0 }, usedInModule: false }],
        file: "foo.ts"
      },
      {
        type: AnalysisResultTypeEnum.POTENTIALLY_UNUSED,
        symbols: [{ name: "bar", start: { line: 0, column: 0 }, end : { line: 0, column: 0 }, usedInModule: false }],
        file: "bar.ts"
      }
    ].forEach(result => state.onResult(result));

    it("should have definitelyUnused exports", () => {
      expect(state.definitelyUnused().length).toBe(2);
    });
  });

  describe("when given state with no unused exports", () => {
    const state = new State();

    [
      {
        type: AnalysisResultTypeEnum.POTENTIALLY_UNUSED,
        symbols: [{ name: "foo", start: { line: 0, column: 0 }, end : { line: 0, column: 0 }, usedInModule: false }],
        file: "foo.ts"
      },
      {
        type: AnalysisResultTypeEnum.DEFINITELY_USED,
        symbols: [{ name: "foo", start: { line: 0, column: 0 }, end : { line: 0, column: 0 }, usedInModule: false }],
        file: "foo.ts"
      }
    ].forEach(result => state.onResult(result));

    it("should not have definitelyUnused exports", () => {
      expect(state.definitelyUnused().length).toBe(0);
    });
  });
});
