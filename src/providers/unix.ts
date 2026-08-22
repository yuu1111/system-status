import type { DiskStatus } from "../types";

export function parseDf(output: string, blockSize: number): DiskStatus[] {
	return output
		.split(/\r?\n/)
		.slice(1)
		.flatMap((line) => {
			const match = line.match(/^\S+\s+(\d+)\s+\d+\s+(\d+)\s+\S+\s+(.+)$/);
			if (!match) return [];
			const size = Number(match[1]) * blockSize;
			const free = Number(match[2]) * blockSize;
			const mount = match[3];
			if (!mount || !Number.isFinite(size) || !Number.isFinite(free)) return [];
			return [{ mount, size, free }];
		});
}
