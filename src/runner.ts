import path from "path";
import JSON5 from "json5";
import fs from "fs";

import { analyze, ResultSymbol } from "./analyzer";
import { initialize } from "./initializer";
import { State } from "./state";
import { present } from "./presenter";
import { IConfigInterface } from "./configurator";


const result = (state: State) => {
  const unused2D = state
    .definitelyUnused()
    .map(result => ({
      file: result.file.replace(process.cwd(), "").replace(new RegExp("^/"), ""),
      symbols: result.symbols
    }))
    .map(
      ({file, symbols}) => symbols.map(symbol => ({ file, symbol }))
    );
  return unused2D.flat();
};

export const run = (config: IConfigInterface, output = console.log) => {
  const tsConfigPath = config.project;
  const { project } = initialize(path.join(process.cwd(), tsConfigPath));
  const tsConfigJSON = JSON5.parse(fs.readFileSync(path.join(process.cwd(), tsConfigPath), "utf-8"));

  const entrypoints: string[] = tsConfigJSON?.files?.map((file: string) => path.join(process.cwd(), file)) || [];

  const state = new State();

  analyze(project, state.onResult, entrypoints);

  const presented: (string | { file: string, symbol: ResultSymbol })[] = config.format ? present(state) : result(state);

  const filterIgnored = config.ignore !== undefined ? presented.filter((res) => {
    if (typeof res === "string") {
      return !res.match(config.ignore);
    } else {
      return res.file.match(config.ignore)
    }
  }) : presented;

  filterIgnored.forEach((value) => {
    output(value);
  });
};
