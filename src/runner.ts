import path from "path";
import JSON5 from "json5";
import fs from "fs";

import { analyze } from "./analyzer";
import { initialize } from "./initializer";
import { State } from "./state";
import { present } from "./presenter";
import {ConfigInterface} from "./config.interface";

export const run = (config: ConfigInterface, output = console.log) => {
  const tsConfigPath = config.project;
  const { project } = initialize(path.join(process.cwd(), tsConfigPath));
  const tsConfigJSON = JSON5.parse(fs.readFileSync(path.join(process.cwd(), tsConfigPath), "utf-8"));

  const entrypoints: string[] = tsConfigJSON?.files?.map((file: string) => path.join(process.cwd(), file)) || [];

  const state = new State();

  analyze(project, state.onResult, entrypoints);

  const presented = present(state);

  presented.forEach(value => {
    output(value);
  });
};