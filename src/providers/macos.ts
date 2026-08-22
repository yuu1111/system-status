import type { CommandRunner } from "../command";
import type { GpuStatus, GpuVendor, StatusDiagnostic } from "../types";
import type { PlatformStatus } from "./types";
import { parseDf } from "./unix";

type DisplayProfiler = {
	SPDisplaysDataType?: Array<{
		_name?: string;
		sppci_model?: string;
		spdisplays_vram?: string;
	}>;
};

function vendorForName(name: string): GpuVendor {
	const value = name.toLowerCase();
	if (value.includes("nvidia")) return "nvidia";
	if (value.includes("amd") || value.includes("radeon")) return "amd";
	if (value.includes("intel")) return "intel";
	if (value.includes("apple")) return "apple";
	return "unknown";
}

function memoryBytes(value: string | undefined): number | undefined {
	const match = value?.match(/([\d.]+)\s*(GB|MB)/i);
	if (!match) return undefined;
	const amount = Number(match[1]);
	if (!Number.isFinite(amount)) return undefined;
	return amount * (match[2]?.toUpperCase() === "GB" ? 1024 ** 3 : 1024 ** 2);
}

export function parseSystemProfiler(output: string): GpuStatus[] {
	const parsed = JSON.parse(output) as DisplayProfiler;
	return (parsed.SPDisplaysDataType ?? []).flatMap((gpu) => {
		const name = gpu.sppci_model ?? gpu._name;
		if (!name) return [];
		const memoryTotal = memoryBytes(gpu.spdisplays_vram);
		return [
			{
				name,
				vendor: vendorForName(name),
				source: "system-profiler" as const,
				...(memoryTotal === undefined ? {} : { memoryTotal }),
			},
		];
	});
}

export async function getMacosStatus(
	runner: CommandRunner,
	timeoutMs = 10_000,
): Promise<PlatformStatus> {
	const diagnostics: StatusDiagnostic[] = [];
	const [cpuName, physicalCores, diskOutput, profilerOutput] =
		await Promise.all([
			runner("sysctl", ["-n", "machdep.cpu.brand_string"], timeoutMs).catch(
				() => undefined,
			),
			runner("sysctl", ["-n", "hw.physicalcpu"], timeoutMs).catch(
				() => undefined,
			),
			runner("df", ["-kP"], timeoutMs).catch(() => undefined),
			runner(
				"system_profiler",
				["SPDisplaysDataType", "-json"],
				timeoutMs,
			).catch(() => undefined),
		]);
	if (!diskOutput)
		diagnostics.push({
			provider: "macos-df",
			code: "command-failed",
			message: "Failed to collect disk information with df",
		});
	let gpus: GpuStatus[] = [];
	if (profilerOutput) {
		try {
			gpus = parseSystemProfiler(profilerOutput);
		} catch {
			diagnostics.push({
				provider: "system-profiler",
				code: "parse-failed",
				message: "Failed to parse system_profiler GPU information",
			});
		}
	}
	const physical = Number(physicalCores);
	return {
		disks: diskOutput ? parseDf(diskOutput, 1024) : [],
		gpus,
		diagnostics,
		...(cpuName ? { cpuName } : {}),
		...(Number.isFinite(physical) && physical > 0
			? { physicalCores: physical }
			: {}),
	};
}
