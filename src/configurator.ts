import { cosmiconfigSync } from "cosmiconfig";
import program from "commander";
import pick from "lodash/fp/pick";

export interface IConfigInterface {
  project?: string;
  ignore?: string;
  format?: boolean;
}

const defaultConfig: IConfigInterface = {
  project: "tsconfig.json",
  ignore: undefined,
  format: true
}

const onlyKnownConfigOptions = pick(Object.keys(defaultConfig));


export const getConfig = () => {
  const cliConfig = onlyKnownConfigOptions(program
    .allowUnknownOption() // required for tests passing in unknown options (ex: https://github.com/nadeesha/ts-prune/runs/1125728070)
    .option('-p, --project [project]', 'TS project configuration file (tsconfig.json)', 'tsconfig.json')
    .option('-i, --ignore [regexp]', 'Path ignore RegExp pattern')
    .parse(process.argv))

  const defaultConfig = {
    project: "tsconfig.json"
  }

  const moduleName = 'ts-prune';
  const explorerSync = cosmiconfigSync(moduleName);
  const fileConfig = explorerSync.search()?.config;

  const config: IConfigInterface = {
    ...defaultConfig,
    ...fileConfig,
    ...cliConfig
  };

  return config;
}