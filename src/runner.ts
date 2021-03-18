import path from "path";
import JSON5 from "json5";
import fs from "fs";

import { analyze } from "./analyzer";
import { initialize } from "./initializer";
import { State } from "./state";
import { present } from "./presenter";
import { IConfigInterface } from "./configurator";
import { fix, verifyClean } from './fixer';

export const run = (config: IConfigInterface, output = console.log) => {
  const tsConfigPath = path.resolve(process.cwd(), config.project);

  const { project } = initialize(tsConfigPath);

  if (config.fix) verifyClean(tsConfigPath);
  
  const tsConfigJSON = JSON5.parse(fs.readFileSync(tsConfigPath, "utf-8"));

  const entrypoints: string[] = tsConfigJSON?.files?.map((file: string) => path.join(process.cwd(), file)) || [];

  const state = new State();

  analyze(project, state.onResult, entrypoints);

  const presented = present(state);

  const filterIgnored = config.ignore !== undefined ? presented.filter(file => !file.match(config.ignore)) : presented;

  filterIgnored.forEach(value => {
    output(value);
  });

  if (config.fix) {
    console.log("fixing...");
    fix(state);
  }

  if (config.exitStatus && presented.length > 0) {
    process.exit(1)
  }
};
