export type GpuVendor = "nvidia" | "amd" | "intel" | "apple" | "unknown";
export type SystemPlatform = "aix" | "android" | "cygwin" | "darwin" | "freebsd" | "haiku" | "linux" | "netbsd" | "openbsd" | "sunos" | "win32";
export type CpuStatus = {
    name: string;
    logicalProcessors: number;
    physicalCores?: number;
    utilization?: number;
};
export type MemoryStatus = {
    /** 使用量（bytes） */
    used: number;
    /** 総容量（bytes） */
    total: number;
};
export type DiskStatus = {
    mount: string;
    label?: string;
    /** 空き容量（bytes） */
    free: number;
    /** 総容量（bytes） */
    size: number;
};
export type GpuStatus = {
    name: string;
    vendor: GpuVendor;
    source: "nvidia-smi" | "sysfs" | "system-profiler" | "windows-cim";
    index?: number;
    uuid?: string;
    /** 使用率（0–100） */
    utilization?: number;
    /** VRAM使用量（bytes） */
    memoryUsed?: number;
    /** VRAM総容量（bytes） */
    memoryTotal?: number;
    /** 温度（℃） */
    temperature?: number;
    /** 消費電力（W） */
    power?: number;
    /** 電力上限（W） */
    powerLimit?: number;
    /** Fan速度（0–100） */
    fanSpeed?: number;
    performanceState?: string;
    /** Graphics clock（MHz） */
    graphicsClock?: number;
    /** Memory clock（MHz） */
    memoryClock?: number;
};
export type StatusDiagnosticCode = "command-failed" | "parse-failed";
export type StatusDiagnostic = {
    provider: string;
    code: StatusDiagnosticCode;
    message: string;
};
export type SystemStatus = {
    platform: SystemPlatform;
    cpu: CpuStatus;
    memory: MemoryStatus;
    disks: DiskStatus[];
    gpus: GpuStatus[];
    /** OSの稼働時間（seconds） */
    uptimeSeconds: number;
    diagnostics: StatusDiagnostic[];
};
//# sourceMappingURL=types.d.ts.map