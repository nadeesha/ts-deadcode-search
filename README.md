![Build](https://img.shields.io/github/workflow/status/nadeesha/ts-prune/Run%20CI%20Pipeline) ![David](https://img.shields.io/david/nadeesha/ts-prune) ![npm](https://img.shields.io/npm/dm/ts-prune) ![GitHub issues](https://img.shields.io/github/issues-raw/nadeesha/ts-prune)

# ts-prune

Remove unused exports in your Typescript project with zero configuration.

[![asciicast](https://asciinema.org/a/liQKNmkGkedCnyHuJzzgu7uDI.svg)](https://asciinema.org/a/liQKNmkGkedCnyHuJzzgu7uDI)

## Getting Started

`ts-prune` exposes a cli that reads your tsconfig file and prints out all the unused exports in your source files.

### Installing

Install ts-prune with yarn or npm

```sh
npm install ts-prune -g
```

### Usage

```sh
ts-prune
```

Or you can install it in your project and alias it to a npm script in package.json.

```json
  "scripts": {
    "find-deadcode": "ts-prune"
  }
```

If you want to run against different Typescript configuration than tsconfig.json:

```sh
ts-prune -p tsconfig.dev.json
```

### Configuration
ts-prune supports CLI and file configuration via [cosmiconfig](https://github.com/davidtheclark/cosmiconfig#usage) (all file formats are supported).

#### Configuration options
- `-p, --project` - __tsconfig.json__ path(`tsconfig.json` by default)
- `-i, --ignore` - errors ignore RegExp pattern
-  `--exit-status` - Set exit status to 1 if unused exports were found (for CI)
-  `--fix` - Fix unused exports by making them unexported

CLI configuration options:
```bash 
ts-prune -p my-tsconfig.json -i my-component-ignore-patterns?
```
Configuration file example `ts-prunerc`: 
```json
{
  "ignore": "my-component-ignore-patterns?"
}
```
 
If you want to use ts-prune as a linter that fails when there are unused exports use `--exit-status`:

```sh
ts-prune --exit-status && echo "no unused exports" || echo "found unused exports!"
```

#### Fix mode

If you want to automatically remove unused export declarations:

```sh
ts-prune --fix
```

This will cause all exported functions, classes and variables to become local declarations, and will remove `export ... from ...` statements.

After this step, you should do the following things:

1. Verify your code still compiles
2. Run `ts-prune --fix` again, since there may be new unused exports after the first run
3. Find new unused local variable declarations with tsconfig `"noUnusedLocals": true`

### FAQ

#### How do I get the count of unused exports?

```sh
ts-prune | wc -l
```

#### How do I ignore a specific path?

```sh
ts-prune | grep -v src/ignore-this-path
```

#### How do I ignore a specific identifier?

You can either, 

##### 1. Prefix the export with `// ts-prune-ignore-next`

```ts
// ts-prune-ignore-next
export const thisNeedsIgnoring = foo;
```

##### 2. Use `grep -v` to ignore a more widely used export name

```sh
ts-prune | grep -v ignoreThisThroughoutMyCodebase
```

### Acknowledgements

- The excellent [ts-morph](https://github.com/dsherret/ts-morph) library. And [this gist](https://gist.github.com/dsherret/0bae87310ce24866ae22425af80a9864) by [@dsherret](https://github.com/dsherret).

### Licence

MIT
