import type { DiskStatus, GpuStatus, StatusDiagnostic } from "../types";

export type PlatformStatus = {
	cpuName?: string;
	physicalCores?: number;
	disks: DiskStatus[];
	gpus: GpuStatus[];
	diagnostics: StatusDiagnostic[];
};
