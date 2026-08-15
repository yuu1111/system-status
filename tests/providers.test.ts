import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { runCommand } from "../src/command.js";
import { sampleCpuUtilization } from "../src/cpu.js";
import { getNvidiaGpus, parseNvidiaSmi } from "../src/gpu/nvidia.js";
import { getSystemStatus } from "../src/index.js";
import { getLinuxStatus } from "../src/providers/linux.js";
import { getMacosStatus, parseSystemProfiler } from "../src/providers/macos.js";
import { parseDf } from "../src/providers/unix.js";
import {
	getWindowsStatus,
	parseWindowsStatus,
} from "../src/providers/windows.js";

describe("Command runner", () => {
	test("標準出力をtrimして返す", async () => {
		const output = await runCommand(
			process.execPath,
			["-e", 'console.log(" status ")'],
			5_000,
		);

		expect(output).toBe("status");
	});

	test("実行不能なコマンドをrejectする", async () => {
		expect(
			runCommand("system-vitals-command-that-does-not-exist", [], 100),
		).rejects.toBeDefined();
	});
});

describe("CPU", () => {
	test("正の計測間隔では0から100の使用率を返す", async () => {
		const utilization = await sampleCpuUtilization(50);

		expect(utilization).toBeNumber();
		expect(utilization).toBeGreaterThanOrEqual(0);
		expect(utilization).toBeLessThanOrEqual(100);
	});
});

describe("NVIDIA GPU", () => {
	test("複数GPUと取得不能な値を正規化する", () => {
		const result = parseNvidiaSmi(
			[
				"0, GPU-1, NVIDIA GeForce RTX 4090, 81, 1024, 24564, 72, 400.5, 450, 60, P0, 2500, 10501",
				"1, GPU-2, NVIDIA T4, 0, 0, 15360, 40, N/A, 70, N/A, P8, 300, 405",
			].join("\n"),
		);

		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			index: 0,
			vendor: "nvidia",
			memoryUsed: 1024 * 1024 ** 2,
			power: 400.5,
		});
		expect(result[1]?.power).toBeUndefined();
		expect(result[1]?.fanSpeed).toBeUndefined();
	});

	test("runnerの成功と失敗を空配列へ正規化する", async () => {
		const success = await getNvidiaGpus(
			async () =>
				"0, GPU-1, NVIDIA T4, 0, 0, 15360, 40, N/A, 70, N/A, P8, 300, 405",
		);
		const failure = await getNvidiaGpus(async () => {
			throw new Error("nvidia-smi unavailable");
		});

		expect(success[0]?.name).toBe("NVIDIA T4");
		expect(failure).toEqual([]);
	});
});

describe("Windows", () => {
	test("RadeonをCIM結果から検出する", () => {
		const result = parseWindowsStatus(
			JSON.stringify({
				cpuName: " AMD Ryzen 9 ",
				physicalCores: 16,
				disks: [{ mount: "C:", label: "Windows", free: 10, size: 100 }],
				gpus: [
					{
						name: "AMD Radeon RX 7900 XTX",
						vendor: "Advanced Micro Devices, Inc.",
						memoryTotal: 24 * 1024 ** 3,
					},
					{ name: "Virtual Desktop Monitor", vendor: "Virtual Display Driver" },
				],
			}),
		);

		expect(result.cpuName).toBe("AMD Ryzen 9");
		expect(result.gpus[0]).toMatchObject({
			vendor: "amd",
			source: "windows-cim",
		});
		expect(result.gpus).toHaveLength(1);
		expect(result.disks[0]?.label).toBe("Windows");
	});

	test("PowerShell 7失敗時にWindows PowerShellへフォールバックする", async () => {
		const shells: string[] = [];
		const result = await getWindowsStatus(async (file) => {
			shells.push(file);
			if (file === "pwsh") throw new Error("pwsh unavailable");
			return JSON.stringify({ cpuName: "Fallback CPU", disks: [], gpus: [] });
		});

		expect(shells).toEqual(["pwsh", "powershell"]);
		expect(result.cpuName).toBe("Fallback CPU");
	});

	test("両方のPowerShellが失敗した場合はdiagnosticを返す", async () => {
		const result = await getWindowsStatus(async () => {
			throw new Error("PowerShell unavailable");
		});

		expect(result).toEqual({
			disks: [],
			gpus: [],
			diagnostics: [
				{
					provider: "windows-cim",
					code: "command-failed",
					message: "Failed to collect Windows information with CIM",
				},
			],
		});
	});
});

describe("Unix", () => {
	test("dfの容量をbyteへ変換する", () => {
		const result = parseDf(
			"Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/disk3s1 100 40 60 40% /",
			1024,
		);

		expect(result).toEqual([{ mount: "/", size: 102400, free: 61440 }]);
	});

	test("Linux sysfsからRadeonのメトリクスを取得する", async () => {
		const result = await getLinuxStatus(
			async (file) => {
				if (file !== "df") throw new Error(`Unexpected command: ${file}`);
				return "Filesystem 1-blocks Used Available Capacity Mounted on\n/dev/sda1 1000 400 600 40% /";
			},
			join(import.meta.dir, "fixtures", "linux-sysfs"),
		);

		expect(result.gpus[0]).toMatchObject({
			name: "AMD Radeon RX 7900 XTX",
			vendor: "amd",
			source: "sysfs",
			utilization: 73,
			memoryUsed: 8_589_934_592,
			memoryTotal: 25_769_803_776,
			temperature: 68,
			power: 245,
			fanSpeed: 50.19607843137255,
		});
		expect(result.disks).toEqual([{ mount: "/", size: 1000, free: 600 }]);
	});

	test("runtime差し替えを公開APIから利用できる", async () => {
		const timeouts: number[] = [];
		const status = await getSystemStatus({
			cpuSampleMs: 0,
			commandTimeoutMs: 1_234,
			runtime: {
				platform: "linux",
				sysfsRoot: join(import.meta.dir, "fixtures", "linux-sysfs"),
				commandRunner: async (file, _args, timeoutMs) => {
					if (timeoutMs !== undefined) timeouts.push(timeoutMs);
					if (file === "df")
						return "Filesystem 1-blocks Used Available Capacity Mounted on\n/dev/sda1 1000 400 600 40% /";
					throw new Error(`Unavailable command: ${file}`);
				},
			},
		});

		expect(status.platform).toBe("linux");
		expect(status.gpus[0]?.vendor).toBe("amd");
		expect(status.cpu.utilization).toBeUndefined();
		expect(timeouts).toEqual([1_234, 1_234]);
	});

	test("部分的な取得失敗を診断コードで返す", async () => {
		const result = await getLinuxStatus(
			async () => {
				throw new Error("df failed");
			},
			join(import.meta.dir, "fixtures", "missing-sysfs"),
		);

		expect(result.diagnostics).toEqual([
			{
				provider: "linux-df",
				code: "command-failed",
				message: "Failed to collect disk information with df",
			},
		]);
	});
});

describe("macOS", () => {
	test("system_profilerのGPUを正規化する", () => {
		const result = parseSystemProfiler(
			JSON.stringify({
				SPDisplaysDataType: [
					{ sppci_model: "Apple M4 Max", spdisplays_vram: "32 GB" },
				],
			}),
		);

		expect(result[0]).toMatchObject({
			vendor: "apple",
			memoryTotal: 32 * 1024 ** 3,
		});
	});

	test("CPU、ディスク、GPUをまとめて取得する", async () => {
		const result = await getMacosStatus(async (file, args) => {
			if (file === "sysctl" && args[1] === "machdep.cpu.brand_string")
				return "Apple M4 Max";
			if (file === "sysctl" && args[1] === "hw.physicalcpu") return "12";
			if (file === "df")
				return "Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/disk3s1 100 40 60 40% /";
			if (file === "system_profiler")
				return JSON.stringify({
					SPDisplaysDataType: [{ sppci_model: "Apple M4 Max" }],
				});
			throw new Error(`Unexpected command: ${file}`);
		});

		expect(result).toMatchObject({
			cpuName: "Apple M4 Max",
			physicalCores: 12,
			disks: [{ mount: "/", size: 102_400, free: 61_440 }],
			gpus: [{ name: "Apple M4 Max", vendor: "apple" }],
			diagnostics: [],
		});
	});

	test("コマンド失敗と壊れたprofiler出力を診断する", async () => {
		const commandFailure = await getMacosStatus(async () => {
			throw new Error("command failed");
		});
		const parseFailure = await getMacosStatus(async (file) => {
			if (file === "system_profiler") return "{";
			if (file === "df") return "";
			return "";
		});

		expect(commandFailure.diagnostics).toEqual([
			{
				provider: "macos-df",
				code: "command-failed",
				message: "Failed to collect disk information with df",
			},
		]);
		expect(parseFailure.diagnostics).toEqual([
			{
				provider: "macos-df",
				code: "command-failed",
				message: "Failed to collect disk information with df",
			},
			{
				provider: "system-profiler",
				code: "parse-failed",
				message: "Failed to parse system_profiler GPU information",
			},
		]);
	});
});
