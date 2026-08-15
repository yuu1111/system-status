import { cpus } from "node:os";

type CpuTimes = { idle: number; total: number };

function cpuTimes(): CpuTimes {
	let idle = 0;
	let total = 0;
	for (const cpu of cpus()) {
		idle += cpu.times.idle;
		total += Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
	}
	return { idle, total };
}

export async function sampleCpuUtilization(
	sampleMs: number,
): Promise<number | undefined> {
	if (sampleMs <= 0) return undefined;
	const before = cpuTimes();
	await new Promise((resolve) => setTimeout(resolve, sampleMs));
	const after = cpuTimes();
	const total = after.total - before.total;
	if (total <= 0) return undefined;
	return Math.max(
		0,
		Math.min(100, (1 - (after.idle - before.idle) / total) * 100),
	);
}
