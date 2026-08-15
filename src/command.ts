import { execFile } from "node:child_process";

export type CommandRunner = (
	file: string,
	args: string[],
	timeoutMs?: number,
) => Promise<string>;

export const runCommand: CommandRunner = (file, args, timeoutMs = 5_000) =>
	new Promise((resolve, reject) => {
		execFile(
			file,
			args,
			{
				encoding: "utf8",
				maxBuffer: 1024 * 1024,
				timeout: timeoutMs,
				windowsHide: true,
			},
			(error, stdout) => {
				if (error) reject(error);
				else resolve(stdout.trim());
			},
		);
	});
