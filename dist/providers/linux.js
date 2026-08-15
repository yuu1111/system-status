import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDf } from "./unix.js";
async function readText(path) {
    try {
        return (await readFile(path, "utf8")).trim();
    }
    catch {
        return undefined;
    }
}
function finiteNumber(value) {
    if (value === undefined)
        return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function linuxCpuInfo(cpuInfo) {
    const cpuName = cpuInfo.match(/^(?:model name|Hardware)\s*:\s*(.+)$/m)?.[1];
    const cores = new Set();
    for (const section of cpuInfo.split(/\n\s*\n/)) {
        const physical = section.match(/^physical id\s*:\s*(.+)$/m)?.[1];
        const core = section.match(/^core id\s*:\s*(.+)$/m)?.[1];
        if (physical !== undefined && core !== undefined)
            cores.add(`${physical}:${core}`);
    }
    return {
        ...(cpuName ? { cpuName: cpuName.trim() } : {}),
        ...(cores.size > 0 ? { physicalCores: cores.size } : {}),
    };
}
function sysfsVendor(value) {
    if (value === "0x10de")
        return "nvidia";
    if (value === "0x1002")
        return "amd";
    if (value === "0x8086")
        return "intel";
    return "unknown";
}
async function firstHwmon(devicePath) {
    try {
        const entries = await readdir(join(devicePath, "hwmon"));
        const entry = entries.find((value) => value.startsWith("hwmon"));
        return entry ? join(devicePath, "hwmon", entry) : undefined;
    }
    catch {
        return undefined;
    }
}
async function linuxGpu(card, sysfsRoot) {
    const devicePath = join(sysfsRoot, "class", "drm", card, "device");
    const vendor = sysfsVendor(await readText(join(devicePath, "vendor")));
    const hwmon = await firstHwmon(devicePath);
    const [productName, utilization, memoryUsed, memoryTotal, temperatureRaw, powerRaw, pwm, pwmMax,] = await Promise.all([
        readText(join(devicePath, "product_name")),
        readText(join(devicePath, "gpu_busy_percent")),
        readText(join(devicePath, "mem_info_vram_used")),
        readText(join(devicePath, "mem_info_vram_total")),
        hwmon ? readText(join(hwmon, "temp1_input")) : undefined,
        hwmon ? readText(join(hwmon, "power1_average")) : undefined,
        hwmon ? readText(join(hwmon, "pwm1")) : undefined,
        hwmon ? readText(join(hwmon, "pwm1_max")) : undefined,
    ]);
    const temperature = finiteNumber(temperatureRaw);
    const power = finiteNumber(powerRaw);
    const pwmValue = finiteNumber(pwm);
    const pwmMaximum = finiteNumber(pwmMax);
    const fallbackName = vendor === "amd"
        ? `AMD GPU (${card})`
        : vendor === "intel"
            ? `Intel GPU (${card})`
            : vendor === "nvidia"
                ? `NVIDIA GPU (${card})`
                : `GPU (${card})`;
    return {
        name: productName || fallbackName,
        vendor,
        source: "sysfs",
        ...numberProperty("utilization", finiteNumber(utilization)),
        ...numberProperty("memoryUsed", finiteNumber(memoryUsed)),
        ...numberProperty("memoryTotal", finiteNumber(memoryTotal)),
        ...numberProperty("temperature", temperature === undefined ? undefined : temperature / 1000),
        ...numberProperty("power", power === undefined ? undefined : power / 1_000_000),
        ...numberProperty("fanSpeed", pwmValue === undefined || !pwmMaximum
            ? undefined
            : (pwmValue / pwmMaximum) * 100),
    };
}
function numberProperty(key, value) {
    return value === undefined ? {} : { [key]: value };
}
async function getLinuxGpus(sysfsRoot) {
    try {
        const entries = await readdir(join(sysfsRoot, "class", "drm"), {
            withFileTypes: true,
        });
        return await Promise.all(entries
            .filter((entry) => (entry.isDirectory() || entry.isSymbolicLink()) &&
            /^card\d+$/.test(entry.name))
            .map((entry) => linuxGpu(entry.name, sysfsRoot)));
    }
    catch {
        return [];
    }
}
export async function getLinuxStatus(runner, sysfsRoot, timeoutMs = 5_000) {
    const [cpuInfo, gpus] = await Promise.all([
        readText("/proc/cpuinfo"),
        getLinuxGpus(sysfsRoot),
    ]);
    let disks = [];
    const diagnostics = [];
    try {
        disks = parseDf(await runner("df", ["-B1", "-P", "-x", "tmpfs", "-x", "devtmpfs"], timeoutMs), 1);
    }
    catch {
        diagnostics.push({
            provider: "linux-df",
            code: "command-failed",
            message: "Failed to collect disk information with df",
        });
    }
    return {
        disks,
        gpus,
        diagnostics,
        ...(cpuInfo ? linuxCpuInfo(cpuInfo) : {}),
    };
}
//# sourceMappingURL=linux.js.map