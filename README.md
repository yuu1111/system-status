# system-vitals

CPU、メモリ、ディスク、GPUの状態をOSやGPUベンダーに依存しない生データへ正規化する、Node.js／Bun向けESMパッケージ。

## インストール

```sh
npm install system-vitals
```

```ts
import { getSystemStatus } from "system-vitals";

const status = await getSystemStatus();
```

## 対応状況

| 環境 | CPU・メモリ | ディスク | GPU |
|---|---:|---:|---|
| Windows | CIM / Node.js | CIM | NVIDIAは`nvidia-smi`、AMD・IntelはCIMによる検出 |
| Linux | `/proc` / Node.js | `df` | NVIDIAは`nvidia-smi`、AMD・Intelはsysfs |
| macOS | `sysctl` / Node.js | `df` | `system_profiler`による検出 |

WindowsのAMD・Intel GPUは名前とベンダーの検出が中心で、使用率、温度、電力などは取得できない場合がある。取得不能なメトリクスは`undefined`になる。

## データ単位

| 値 | 単位 |
|---|---|
| メモリ、VRAM、ディスク | bytes |
| 使用率、Fan速度 | 0–100 |
| 温度 | ℃ |
| 電力 | W |
| Clock | MHz |
| Uptime | seconds |

`diagnostics`は部分的な取得失敗を返す。`code`を機械判定に使い、`message`はログや調査の補助として扱う。表示文言、警告しきい値、Ollamaなどアプリケーション固有の状態取得は利用側の責務とする。

CPU使用率は既定で100ms計測する。不要なら待ち時間を省略できる。

```ts
const status = await getSystemStatus({ cpuSampleMs: 0 });
```

外部コマンドは既定で10秒後に停止する。環境に合わせて変更できる。

```ts
const status = await getSystemStatus({ commandTimeoutMs: 5_000 });
```

## 開発

```sh
bun install
bun run lint
bun run check
bun test
bun run build
bun run test:node
npm pack --dry-run
```

`build`はNode.jsから直接importできるESMと型定義を`dist/`へ生成する。

## License

MIT
