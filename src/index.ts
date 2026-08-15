import {
	cpus,
	platform as currentPlatform,
	freemem,
	totalmem,
	uptime,
} from "node:os";
import { type CommandRunner, runCommand } from "./command.js";
import { sampleCpuUtilization } from "./cpu.js";
import { getNvidiaGpus } from "./gpu/nvidia.js";
import { getLinuxStatus } from "./providers/linux.js";
import { getMacosStatus } from "./providers/macos.js";
import type { PlatformStatus } from "./providers/types.js";
import { getWindowsStatus } from "./providers/windows.js";
import type { GpuStatus, SystemPlatform, SystemStatus } from "./types.js";

export type { CommandRunner } from "./command.js";
export type {
	CpuStatus,
	DiskStatus,
	GpuStatus,
	GpuVendor,
	MemoryStatus,
	StatusDiagnostic,
	StatusDiagnosticCode,
	SystemPlatform,
	SystemStatus,
} from "./types.js";

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

const EMPTY_PLATFORM_STATUS: PlatformStatus = {
	disks: [],
	gpus: [],
	diagnostics: [],
};

async function platformStatus(
	platform: SystemPlatform,
	runner: CommandRunner,
	sysfsRoot: string,
	timeoutMs: number,
): Promise<PlatformStatus> {
	if (platform === "win32") return getWindowsStatus(runner, timeoutMs);
	if (platform === "linux") return getLinuxStatus(runner, sysfsRoot, timeoutMs);
	if (platform === "darwin") return getMacosStatus(runner, timeoutMs);
	return EMPTY_PLATFORM_STATUS;
}

function mergeGpus(
	platformGpus: GpuStatus[],
	nvidiaGpus: GpuStatus[],
): GpuStatus[] {
	if (nvidiaGpus.length === 0) return platformGpus;
	return [
		...nvidiaGpus,
		...platformGpus.filter((gpu) => gpu.vendor !== "nvidia"),
	];
}

export async function getSystemStatus(
	options: GetSystemStatusOptions = {},
): Promise<SystemStatus> {
	const platform: SystemPlatform =
		options.runtime?.platform ?? currentPlatform();
	const runner = options.runtime?.commandRunner ?? runCommand;
	const commandTimeoutMs = Math.max(1, options.commandTimeoutMs ?? 10_000);
	const [specific, nvidiaGpus, cpuUtilization] = await Promise.all([
		platformStatus(
			platform,
			runner,
			options.runtime?.sysfsRoot ?? "/sys",
			commandTimeoutMs,
		),
		getNvidiaGpus(runner, commandTimeoutMs),
		sampleCpuUtilization(options.cpuSampleMs ?? 100),
	]);
	const processors = cpus();
	const memoryTotal = totalmem();
	return {
		platform,
		cpu: {
			name: specific.cpuName ?? processors[0]?.model ?? "Unknown CPU",
			logicalProcessors: processors.length,
			...(specific.physicalCores === undefined
				? {}
				: { physicalCores: specific.physicalCores }),
			...(cpuUtilization === undefined ? {} : { utilization: cpuUtilization }),
		},
		memory: {
			used: memoryTotal - freemem(),
			total: memoryTotal,
		},
		disks: specific.disks,
		gpus: mergeGpus(specific.gpus, nvidiaGpus),
		uptimeSeconds: uptime(),
		diagnostics: specific.diagnostics,
	};
}
