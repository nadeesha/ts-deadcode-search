import { State } from "./state";
import { ResultSymbol } from "./analyzer";

const USED_IN_MODULE = ' (used in module)';

const formatOutput = (file: string, result: ResultSymbol) => {
  const {name, start: {line}, usedInModule} = result;
  return `${file}:${line} - ${name}` + (usedInModule ? USED_IN_MODULE : '');
}

export const present = (state: State): string[] => {
  const unused2D = state
    .definitelyUnused()
    .map(result => ({
      file: result.file.replace(process.cwd(), "").replace(new RegExp("^/"), ""),
      symbols: result.symbols
    }))
    .map(
      ({file, symbols}) => symbols.map(symbol =>formatOutput(file, symbol))
    );

  return [].concat.apply([], unused2D);
};
