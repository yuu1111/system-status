import { execFile } from "node:child_process";
export const runCommand = (file, args, timeoutMs = 5_000) => new Promise((resolve, reject) => {
    execFile(file, args, {
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
        timeout: timeoutMs,
        windowsHide: true,
    }, (error, stdout) => {
        if (error)
            reject(error);
        else
            resolve(stdout.trim());
    });
});
//# sourceMappingURL=command.js.map