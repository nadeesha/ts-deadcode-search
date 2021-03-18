import { ImportDeclaration, ExportDeclaration } from "ts-morph";
import { realpathSync } from "fs";

export const getModuleSourceFile = (decl: ImportDeclaration | ExportDeclaration) => {
  const fpath = decl.getModuleSpecifierSourceFile()?.getFilePath();
  if(fpath) return realpathSync(fpath);
  return null;
}
