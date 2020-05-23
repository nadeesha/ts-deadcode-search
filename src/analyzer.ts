import {
  ExportDeclaration,
  ImportDeclaration,
  Project,
  SourceFile,
  SourceFileReferencingNodes,
  ts
} from "ts-morph";
import { isDefinitelyUsedImport } from "./util/isDefinitelyUsedImport";
import { getModuleSourceFile } from "./util/getModuleSourceFile";

type OnResultType = (result: IAnalysedResult) => void;

export enum AnalysisResultTypeEnum {
  POTENTIALLY_UNUSED,
  DEFINITELY_USED
}

export interface IAnalysedResult {
  file: string;
  type: AnalysisResultTypeEnum;
  symbols: Array<string>;
}

function handleExportDeclaration(node: SourceFileReferencingNodes) {
  return (node as ExportDeclaration).getNamedExports().map(n => n.getName());
}

function handleImportDeclaration(node: SourceFileReferencingNodes) {
  const referenced = [] as string[];

  (node as ImportDeclaration)
    .getNamedImports()
    .map(n => referenced.push(n.getName()));

  const defaultImport = (node as ImportDeclaration).getDefaultImport();

  if (defaultImport) {
    referenced.push("default");
  }

  return referenced;
}

const nodeHandlers = {
  [ts.SyntaxKind.ExportDeclaration.toString()]: handleExportDeclaration,
  [ts.SyntaxKind.ImportDeclaration.toString()]: handleImportDeclaration
};

function getExported(file: SourceFile) {
  const exported: string[] = [];

  file.getExportSymbols().map(symbol => {
    exported.push(symbol.compilerSymbol.name);
  });

  return exported;
}

const emitDefinitelyUsed = (file: SourceFile, onResult: OnResultType) => {
  file
    .getImportDeclarations()
    .map(decl => ({
      moduleSourceFile: getModuleSourceFile(decl),
      definitelyUsed: isDefinitelyUsedImport(decl)
    }))
    .filter(meta => meta.definitelyUsed && !!meta.moduleSourceFile)
    .forEach(({ moduleSourceFile }) => {
      onResult({
        file: moduleSourceFile,
        symbols: [],
        type: AnalysisResultTypeEnum.DEFINITELY_USED
      });
    });

  file
    .getExportDeclarations()
    .filter(decl => decl.getText().includes("*"))
    .forEach((decl) => {
      onResult({
        file: getModuleSourceFile(decl),
        symbols: [],
        type: AnalysisResultTypeEnum.DEFINITELY_USED
      });
    });
};

const emitPotentiallyUnused = (file: SourceFile, onResult: OnResultType) => {
  const exported = getExported(file);

  const referenced2D = file
    .getReferencingNodesInOtherSourceFiles()
    .map((node: SourceFileReferencingNodes) => {
      const handler =
        nodeHandlers[node.getKind().toString()] ||
        function noop() {
          return [] as string[];
        };
      return handler(node);
    });

  const referenced = ([] as string[]).concat(...referenced2D);

  const unused = exported.filter(exp => !referenced.includes(exp));

  onResult({
    file: file.getFilePath(),
    symbols: unused,
    type: AnalysisResultTypeEnum.POTENTIALLY_UNUSED
  });
};

export const analyze = (project: Project, onResult: OnResultType) => {
  project.getSourceFiles().forEach(file => {
    emitPotentiallyUnused(file, onResult);
    emitDefinitelyUsed(file, onResult);
  });
};
