import { getModuleSourceFile } from "./util/getModuleSourceFile";
import { State } from "./state";
import { IAnalysedResult } from "./analyzer";
import { Node, SourceFile } from "ts-morph";
import { spawnSync } from "child_process";
import { dirname } from "path";

export const verifyClean = (tsProjectPath: string) => {
  const project = dirname(tsProjectPath);
  const proc = spawnSync("git", ["status", "--short", "--porcelain"], {cwd: project, encoding: "utf8"});
  if (proc.status !== 0 || proc.stdout.length > 0) {
    throw Error(`${project} seems to be dirty, please commit or stash all changes before running fix mode:\n${proc.stderr}${proc.stdout}`)
  }
}
export const fix = (state: State): void => {
  state.definitelyUnused().forEach((val) => {
    val.symbols.forEach(({ symbol, name }) => {
      let sf: SourceFile;
      const decls = symbol.getDeclarations();
      if (decls.length < 1) return;
      for (let decl of decls) {
        if (sf && sf.getFilePath() !== decl.getSourceFile().getFilePath())
          throw Error(`inconsistency`);
        sf = decl.getSourceFile();
        if (Node.isVariableDeclaration(decl)) {
          // e.g. `export const x = "foo";
          // we need to get the outer node which is a VariableStatement which is an ExportableNode
          decl = decl.getVariableStatement();
        }
        if (Node.isExportableNode(decl)) {
          decl.setIsExported(false);
          console.log("fixed ", val.file, name);
        } else if (Node.isExportSpecifier(decl)) {
          // e.g. export { default as Xyz } from "./src/...";'
          if (decl.getExportDeclaration().getNamedExports().length === 1) {
            // this is the only named export, remove the whole thing
            decl.getExportDeclaration().remove();
          } else {
            // remove only this named export from the statement
            decl.remove();
          }
        } else if (Node.isExportAssignment(decl)) {
          // export xyz = foo;
          decl.remove();
        } else {
          console.warn(
            "could not fix ",
            val.file,
            name,
            "unknown node type",
            decl.getKindName(),
            decl.getText()
          );
        }
      }
      // for some reason need to save between symbols not just afterwards
      sf.saveSync();
    });
  });
};
