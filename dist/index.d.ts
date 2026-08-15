import { type CommandRunner } from "./command.js";
import type { SystemPlatform, SystemStatus } from "./types.js";
export type { CommandRunner } from "./command.js";
export type { CpuStatus, DiskStatus, GpuStatus, GpuVendor, MemoryStatus, StatusDiagnostic, StatusDiagnosticCode, SystemPlatform, SystemStatus, } from "./types.js";
export type GetSystemStatusOptions = {
    /** CPU使用率を計測する間隔。0を指定すると計測を省略する */
    cpuSampleMs?: number;
    /** 外部コマンドごとのタイムアウト（milliseconds） */
    commandTimeoutMs?: number;
    /** テストや埋め込み用途で実行環境を差し替える */
    runtime?: {
        platform?: SystemPlatform;
        commandRunner?: CommandRunner;
        sysfsRoot?: string;
    };
};
export declare function getSystemStatus(options?: GetSystemStatusOptions): Promise<SystemStatus>;
//# sourceMappingURL=index.d.ts.map