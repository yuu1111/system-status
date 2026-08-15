# system-vitals

English | [日本語](./README.ja.md)

An ESM package for Node.js and Bun that normalizes CPU, memory, disk, and GPU
status across operating systems and GPU vendors into a consistent data model.

## Requirements

- Node.js 20 or later, or Bun

## Installation

```sh
npm install system-vitals
```

## Usage

```ts
import { getSystemStatus } from "system-vitals";

const status = await getSystemStatus();
```

## Platform support

| Platform | CPU and memory | Disks | GPUs |
| --- | --- | --- | --- |
| Windows | CIM / Node.js | CIM | NVIDIA through `nvidia-smi`; AMD and Intel detection through CIM |
| Linux | `/proc` / Node.js | `df` | NVIDIA through `nvidia-smi`; AMD and Intel through sysfs |
| macOS | `sysctl` / Node.js | `df` | Detection through `system_profiler` |

On Windows, AMD and Intel GPU support focuses on name and vendor detection.
Metrics such as utilization, temperature, and power may be unavailable. Metrics
that cannot be collected are returned as `undefined`.

## Units

| Value | Unit |
| --- | --- |
| Memory, VRAM, disk | bytes |
| Utilization, fan speed | 0–100 |
| Temperature | °C |
| Power | W |
| Clock speed | MHz |
| Uptime | seconds |

The `diagnostics` array reports partial collection failures. Use `code` for
programmatic checks and `message` for logging and investigation. Presentation,
alert thresholds, and application-specific status collection are left to the
consumer.

CPU utilization is sampled for 100 ms by default. Set the interval to `0` to
skip sampling and avoid the delay.

```ts
const status = await getSystemStatus({ cpuSampleMs: 0 });
```

External commands time out after 10 seconds by default. Adjust the timeout to
match the environment.

```ts
const status = await getSystemStatus({ commandTimeoutMs: 5_000 });
```

## Development

```sh
bun install
bun run lint
bun run check
bun test
bun run build
bun run test:node
npm pack --dry-run
```

The build generates Node.js-compatible ESM and TypeScript declarations in
`dist/`.

## License

MIT
