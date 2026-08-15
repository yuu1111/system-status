import type { CommandRunner } from "../command.js";
import type { GpuStatus } from "../types.js";
export declare function parseNvidiaSmi(output: string): GpuStatus[];
export declare function getNvidiaGpus(runner: CommandRunner, timeoutMs?: number): Promise<GpuStatus[]>;
//# sourceMappingURL=nvidia.d.ts.map