import type { CommandRunner } from "../command";
import type { DiskStatus, GpuStatus, GpuVendor } from "../types";
import type { PlatformStatus } from "./types";

type WindowsWireStatus = {
	cpuName?: string;
	physicalCores?: number;
	disks?: Array<{
		mount?: string;
		label?: string;
		free?: number;
		size?: number;
	}>;
	gpus?: Array<{
		name?: string;
		vendor?: string;
		memoryTotal?: number;
	}>;
};

function gpuVendor(name: string, vendor = ""): GpuVendor {
	const value = `${vendor} ${name}`.toLowerCase();
	if (value.includes("nvidia")) return "nvidia";
	if (value.includes("amd") || value.includes("advanced micro devices"))
		return "amd";
	if (value.includes("intel")) return "intel";
	return "unknown";
}

function isSoftwareAdapter(name: string): boolean {
	const value = name.toLowerCase();
	return [
		"microsoft basic display",
		"microsoft remote display",
		"virtual desktop monitor",
	].some((fragment) => value.includes(fragment));
}

export function parseWindowsStatus(output: string): PlatformStatus {
	const parsed = JSON.parse(output) as WindowsWireStatus;
	const disks: DiskStatus[] = (parsed.disks ?? []).flatMap((disk) => {
		if (
			!disk.mount ||
			!Number.isFinite(disk.free) ||
			!Number.isFinite(disk.size)
		)
			return [];
		return [
			{
				mount: disk.mount,
				free: disk.free ?? 0,
				size: disk.size ?? 0,
				...(disk.label ? { label: disk.label } : {}),
			},
		];
	});
	const gpus: GpuStatus[] = (parsed.gpus ?? []).flatMap((gpu) => {
		if (!gpu.name || isSoftwareAdapter(gpu.name)) return [];
		return [
			{
				name: gpu.name.trim(),
				vendor: gpuVendor(gpu.name, gpu.vendor),
				source: "windows-cim" as const,
				...(gpu.memoryTotal && gpu.memoryTotal > 0
					? { memoryTotal: gpu.memoryTotal }
					: {}),
			},
		];
	});
	return {
		disks,
		gpus,
		diagnostics: [],
		...(parsed.cpuName ? { cpuName: parsed.cpuName.trim() } : {}),
		...(parsed.physicalCores && parsed.physicalCores > 0
			? { physicalCores: parsed.physicalCores }
			: {}),
	};
}

const WINDOWS_SCRIPT = [
	"$cpuInfo=Get-CimInstance Win32_Processor",
	'$disks=@(Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Where-Object DeviceID | Sort-Object DeviceID | ForEach-Object { @{mount=$_.DeviceID;label=$_.VolumeName;free=[double]$_.FreeSpace;size=[double]$_.Size} })',
	"$gpus=@(Get-CimInstance Win32_VideoController | Where-Object Name | ForEach-Object { @{name=$_.Name;vendor=$_.AdapterCompatibility} })",
	"@{cpuName=($cpuInfo | Select-Object -First 1).Name;physicalCores=[int](($cpuInfo | Measure-Object NumberOfCores -Sum).Sum);disks=$disks;gpus=$gpus}|ConvertTo-Json -Compress -Depth 3",
].join("; ");

export async function getWindowsStatus(
	runner: CommandRunner,
	timeoutMs = 5_000,
): Promise<PlatformStatus> {
	for (const shell of ["pwsh", "powershell"]) {
		try {
			return parseWindowsStatus(
				await runner(
					shell,
					[
						"-NoLogo",
						"-NoProfile",
						"-NonInteractive",
						"-Command",
						WINDOWS_SCRIPT,
					],
					timeoutMs,
				),
			);
		} catch {
			// PowerShell 7がない環境ではWindows PowerShellへフォールバックする
		}
	}
	return {
		disks: [],
		gpus: [],
		diagnostics: [
			{
				provider: "windows-cim",
				code: "command-failed",
				message: "Failed to collect Windows information with CIM",
			},
		],
	};
}
