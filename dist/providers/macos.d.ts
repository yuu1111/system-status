import type { CommandRunner } from "../command.js";
import type { GpuStatus } from "../types.js";
import type { PlatformStatus } from "./types.js";
export declare function parseSystemProfiler(output: string): GpuStatus[];
export declare function getMacosStatus(runner: CommandRunner, timeoutMs?: number): Promise<PlatformStatus>;
//# sourceMappingURL=macos.d.ts.map