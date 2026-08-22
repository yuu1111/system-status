# Repository Guidelines

## Project Structure & Module Organization

`src/index.ts` is the public entry point and combines Node.js system data with platform-specific collectors. Shared public types live in `src/types.ts`; command execution and CPU sampling are isolated in `src/command.ts` and `src/cpu.ts`. OS collectors belong in `src/providers/`, while vendor-specific GPU logic belongs in `src/gpu/`. Tests are in `tests/**/*.test.ts`, with deterministic sysfs samples under `tests/fixtures/`. `scripts/` contains build and package smoke-test helpers. `dist/` is tracked generated output: update source files, then regenerate it rather than editing it directly.

## Build, Test, and Development Commands

Use the Bun version declared by `packageManager` in `package.json`.

- `bun install --frozen-lockfile` installs exactly the locked dependencies.
- `bun run lint` checks `src/`, `tests/`, and `scripts/` with Biome.
- `bun run check` runs TypeScript type-checking without emitting files.
- `bun test` runs the Bun test suite.
- `bun run build` emits ESM JavaScript and declarations to `dist/`, then adds Node-compatible `.js` import extensions.
- `bun run test:node` rebuilds and smoke-tests the packaged entry point.
- `npm pack --dry-run --ignore-scripts` verifies the publishable file set.

Before opening a PR, run lint, type-checking, tests, build, and the package dry run. CI repeats tests and builds on Linux, Windows, and macOS.

## Coding Style & Naming Conventions

Write strict TypeScript ESM and follow the shared Biome/TypeScript configurations referenced by `biome.json` and `tsconfig.json`. Biome enforces tab indentation and formatting; run `bun run format` only when intentionally applying fixes. Use `camelCase` for functions and variables, `PascalCase` for types, and lowercase descriptive module names such as `providers/macos.ts`. Preserve established units: bytes, percentages from 0–100, degrees Celsius, watts, and MHz.

## Testing Guidelines

Use `bun:test` with `describe`, `test`, and `expect`. Name files `*.test.ts` and keep fixtures under `tests/fixtures/`. Inject `CommandRunner`, platform, and sysfs roots instead of depending on the host OS. Cover successful parsing, unavailable commands, malformed output, and partial-failure diagnostics. There is no configured coverage threshold; prioritize behavioral and cross-platform regression cases. Run one case with `bun test -t "pattern"`.

## Commit & Pull Request Guidelines

Recent commits use short, imperative, sentence-case subjects, for example `Add provider integration and failure handling tests`. Keep each commit focused and explain release or compatibility effects in the body when needed. PRs should summarize the behavior change, identify affected platforms, link relevant issues, and list verification commands. Include screenshots only for documentation rendering changes; API changes should include a concise usage or output example.
