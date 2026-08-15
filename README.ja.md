# system-vitals

[English](./README.md) | 日本語

CPU、メモリ、ディスク、GPUの状態を、OSやGPUベンダーをまたいで一貫したデータモデルへ正規化するNode.js／Bun向けESMパッケージです。

## 必要環境

- Node.js 20以上、またはBun

## インストール

```sh
npm install system-vitals
```

## 使い方

```ts
import { getSystemStatus } from "system-vitals";

const status = await getSystemStatus();
```

## 対応状況

| 環境 | CPU・メモリ | ディスク | GPU |
| --- | --- | --- | --- |
| Windows | CIM / Node.js | CIM | NVIDIAは`nvidia-smi`、AMD・IntelはCIMによる検出 |
| Linux | `/proc` / Node.js | `df` | NVIDIAは`nvidia-smi`、AMD・Intelはsysfs |
| macOS | `sysctl` / Node.js | `df` | `system_profiler`による検出 |

WindowsのAMD・Intel GPUは名前とベンダーの検出が中心です。使用率、温度、電力などは取得できない場合があります。取得不能なメトリクスは`undefined`になります。

## データ単位

| 値 | 単位 |
| --- | --- |
| メモリ、VRAM、ディスク | bytes |
| 使用率、ファン速度 | 0–100 |
| 温度 | ℃ |
| 電力 | W |
| クロック速度 | MHz |
| 稼働時間 | seconds |

`diagnostics`は部分的な取得失敗を返します。`code`を機械判定に使い、`message`はログや調査の補助として扱ってください。表示、警告しきい値、アプリケーション固有の状態取得は利用側の責務です。

CPU使用率は既定で100 ms計測します。待ち時間を省略する場合は計測間隔に`0`を指定します。

```ts
const status = await getSystemStatus({ cpuSampleMs: 0 });
```

外部コマンドは既定で10秒後に停止します。環境に合わせてタイムアウトを変更できます。

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

buildはNode.jsから直接importできるESMとTypeScript型定義を`dist/`へ生成します。

## ライセンス

MIT
