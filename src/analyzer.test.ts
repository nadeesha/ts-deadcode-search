import { Project, ts } from "ts-morph";
import {
  getExported,
  getPotentiallyUnused,
  importsForSideEffects,
  trackWildcardUses,
} from "./analyzer";

const fooSrc = `
export const x = 'x';
export const y = 'y';
export const z = {a: 'a'};
export const w = 'w';
export type ABC = 'a' | 'b' | 'c';

export const unusedC = 'c';
export type UnusedT = 'T';
`;

const starImportSrc = `
import * as foo from './foo';
import {UseFoo} from './use-foo';

const x = foo.x;
const {y} = foo;
const {z: {a}} = foo;
const w = foo['w'];
type ABC = foo.ABC;
`;

const useFooSrc = `
export function UseFoo(foo: string) {
  alert(foo);
}
`;

describe("analyzer", () => {
  const project = new Project();
  const foo = project.createSourceFile("/project/foo.ts", fooSrc);
  const useFoo = project.createSourceFile("/project/use-foo.ts", useFooSrc);
  const star = project.createSourceFile("/project/star.ts", starImportSrc);

  it("should track import wildcards", () => {
    // TODO(danvk): rename this to importSideEffects()
    expect(importsForSideEffects(star)).toEqual([]);
  });

  it("should track named exports", () => {
    expect(getExported(foo)).toEqual([
      { name: "x", line: 2 },
      { name: "y", line: 3 },
      { name: "z", line: 4 },
      { name: "w", line: 5 },
      { name: "ABC", line: 6 },
      { name: "unusedC", line: 8 },
      { name: "UnusedT", line: 9 },
    ]);

    expect(getExported(useFoo)).toEqual([{ name: "UseFoo", line: 2 }]);
  });

  it("should track named imports", () => {
    expect(getPotentiallyUnused(foo)).toEqual({
      file: "/project/foo.ts",
      symbols: [
        { line: 8, name: "unusedC", usedInModule: false },
        { line: 9, name: "UnusedT", usedInModule: false },
      ],
      type: 0,
    });
  });

  it("should track usage through star imports", () => {
    const importNode = star.getFirstDescendantByKindOrThrow(
      ts.SyntaxKind.ImportDeclaration
    );

    expect(trackWildcardUses(importNode)).toEqual(["x", "y", "z", "w", "ABC"]);
  });
});
