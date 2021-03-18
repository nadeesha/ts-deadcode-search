import { ignoreComment } from "./constants";
import {
  ExportDeclaration,
  ImportDeclaration,
  Project,
  SourceFile,
  SourceFileReferencingNodes,
  ts,
  Symbol,
  SyntaxKind,
  StringLiteral,
  ObjectBindingPattern
} from "ts-morph";
import { isDefinitelyUsedImport } from "./util/isDefinitelyUsedImport";
import { getModuleSourceFile } from "./util/getModuleSourceFile";
import { getNodesOfKind } from './util/getNodesOfKind';
import countBy from "lodash/fp/countBy";
import last from "lodash/fp/last";
import { realpathSync } from "fs";

type OnResultType = (result: IAnalysedResult) => void;

export enum AnalysisResultTypeEnum {
  POTENTIALLY_UNUSED,
  DEFINITELY_USED
}

export type ResultSymbol = {
  name: string;
  line?: number;
  usedInModule: boolean;
  symbol: Symbol;
};

export type IAnalysedResult = {
  file: string;
  type: AnalysisResultTypeEnum;
  symbols: ResultSymbol[];
}

function handleExportDeclaration(node: SourceFileReferencingNodes) {
  return (node as ExportDeclaration).getNamedExports().map(n => n.getName());
}

function handleImportDeclaration(node: ImportDeclaration) {
  return (
    [
      ...node.getNamedImports().map(n => n.getName()),
      ...(node.getDefaultImport() ? ['default'] : []),
      ...(node.getNamespaceImport() ? trackWildcardUses(node) : []),
    ]
  );
}

/**
 * Given an `import * as foo from './foo'` import, figure out which symbols in foo are used.
 *
 * If there are uses which cannot be tracked, this returns ["*"].
 */
export const trackWildcardUses = (node: ImportDeclaration) => {
  const clause = node.getImportClause();
  const namespaceImport = clause.getFirstChildByKind(ts.SyntaxKind.NamespaceImport);
  const source = node.getSourceFile();

  const uses = getNodesOfKind(source, ts.SyntaxKind.Identifier)
    .filter(n => (n.getSymbol()?.getDeclarations() ?? []).includes(namespaceImport));

  const symbols: string[] = [];
  for (const use of uses) {
    if (use.getParentIfKind(SyntaxKind.NamespaceImport)) {
      // This is the "import * as module" line.
      continue;
    }

    const p = use.getParentIfKind(SyntaxKind.PropertyAccessExpression);
    if (p) {
      // e.g. `module.x`
      symbols.push(p.getName());
      continue;
    }

    const el = use.getParentIfKind(SyntaxKind.ElementAccessExpression);
    if (el) {
      const arg = el.getArgumentExpression();
      if (arg.getKind() === SyntaxKind.StringLiteral) {
        // e.g. `module['x']`
        symbols.push((arg as StringLiteral).getLiteralText());
        continue;
      }
    }

    const varExp = use.getParentIfKind(SyntaxKind.VariableDeclaration);
    if (varExp) {
      const nameNode = varExp.getNameNode();
      if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
        const binder = (nameNode as ObjectBindingPattern);
        for (const bindEl of binder.getElements()) {
          const p = bindEl.getPropertyNameNode();
          if (p) {
            // e.g. const {z: {a}} = module;
            symbols.push(p.getText());
          } else {
            // e.g. const {x} = module;
            symbols.push(bindEl.getName());
          }
        }
        continue;
      }
    }

    const qualExp = use.getParentIfKind(SyntaxKind.QualifiedName);
    if (qualExp) {
      // e.g. type T = module.TypeName;
      symbols.push(qualExp.getRight().getText());
      continue;
    }

    // If we don't understand a use, be conservative.
    return ['*'];
  }

  return symbols;
};

// like import("../xyz")
function handleDynamicImport(node: SourceFileReferencingNodes) {
  // a dynamic import always imports all elements, so we can't tell if only some are used
  return ["*"];
}

const nodeHandlers = {
  [ts.SyntaxKind.ExportDeclaration.toString()]: handleExportDeclaration,
  [ts.SyntaxKind.ImportDeclaration.toString()]: handleImportDeclaration,
  [ts.SyntaxKind.CallExpression.toString()]: handleDynamicImport,
};

const mustIgnore = (symbol: Symbol, file: SourceFile) => {
  const symbolLinePos = symbol
    .getDeclarations()
    .map((decl) => decl.getStartLinePos())
    .reduce((currentMin, current) => Math.min(currentMin, current), Infinity);

  const comments = file
    .getDescendantAtPos(symbolLinePos)
    ?.getLeadingCommentRanges();

  if (!comments) {
    return false;
  }

  return last(comments)?.getText().includes(ignoreComment);
};

const lineNumber = (symbol: Symbol) =>
  symbol.getDeclarations().map(decl => decl.getStartLineNumber()).reduce((currentMin, current) => Math.min(currentMin, current), Infinity)

export const getExported = (file: SourceFile) =>
  file.getExportSymbols()
    .filter(symbol => !mustIgnore(symbol, file))
    .map(symbol => ({
      symbol,
      name: symbol.compilerSymbol.name,
      line: lineNumber(symbol)
    }));

/* Returns all the "import './y';" imports, which must be for side effects */
export const importsForSideEffects = (file: SourceFile): IAnalysedResult[] =>
  file
    .getImportDeclarations()
    .map(decl => ({
      moduleSourceFile: getModuleSourceFile(decl),
      definitelyUsed: isDefinitelyUsedImport(decl)
    }))
    .filter(meta => meta.definitelyUsed && !!meta.moduleSourceFile)
    .map(({ moduleSourceFile }) => ({
      file: moduleSourceFile,
      symbols: [],
      type: AnalysisResultTypeEnum.DEFINITELY_USED
    }));

const exportWildCards = (file: SourceFile): IAnalysedResult[] =>
  file
    .getExportDeclarations()
    .filter(decl => decl.getText().includes("*"))
    .map((decl) => ({
      file: getModuleSourceFile(decl),
      symbols: [],
      type: AnalysisResultTypeEnum.DEFINITELY_USED
    }));

const getDefinitelyUsed = (file: SourceFile): IAnalysedResult[] => ([
  ...importsForSideEffects(file),
  ...exportWildCards(file),
]);

export const getPotentiallyUnused = (file: SourceFile): IAnalysedResult => {
  const exported = getExported(file);

  const idsInFile = file.getDescendantsOfKind(ts.SyntaxKind.Identifier);
  const referenceCounts = countBy(x => x)((idsInFile || []).map(node => node.getText()));
  const referencedInFile = Object.entries(referenceCounts)
    .reduce(
      (previous, [name, count]) => previous.concat(count > 1 ? [name] : []), 
      []
    );

  const referenced = file
    .getReferencingNodesInOtherSourceFiles()
    .reduce(
      (previous, node: SourceFileReferencingNodes) => {
        const kind = node.getKind().toString();
        const value = nodeHandlers?.[kind]?.(node) ?? [];
        
        return previous.concat(value);
      }, 
      []
    );

  const unused = referenced.includes("*") ? [] :
    exported.filter(exp => !referenced.includes(exp.name))
      .map(exp => ({ ...exp, usedInModule: referencedInFile.includes(exp.name) }))

  return {
    file: realpathSync(file.getFilePath()),
    symbols: unused,
    type: AnalysisResultTypeEnum.POTENTIALLY_UNUSED
  };
};

const emitTsConfigEntrypoints = (entrypoints: string[], onResult: OnResultType) =>
  entrypoints.map(file => ({
    file,
    sourceFileInstance: null,
    symbols: [],
    type: AnalysisResultTypeEnum.DEFINITELY_USED,
  })).forEach(emittable => onResult(emittable))

export const analyze = (project: Project, onResult: OnResultType, entrypoints: string[]) => {
  project.getSourceFiles().forEach(file => {
    [
      getPotentiallyUnused(file),
      ...getDefinitelyUsed(file),
    ].forEach(result => {
      if (!result.file) return // Prevent passing along a "null" filepath. Fixes #105
      onResult({ ...result, file: realpathSync(result.file) })
    });
  });

  emitTsConfigEntrypoints(entrypoints, onResult);
};
