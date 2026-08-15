import type { CommandRunner } from "../command.js";
import type { PlatformStatus } from "./types.js";
export declare function parseWindowsStatus(output: string): PlatformStatus;
export declare function getWindowsStatus(runner: CommandRunner, timeoutMs?: number): Promise<PlatformStatus>;
//# sourceMappingURL=windows.d.ts.map