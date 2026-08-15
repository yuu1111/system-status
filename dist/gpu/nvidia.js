const MEBIBYTE = 1024 ** 2;
function finiteNumber(value) {
    if (!value || value === "N/A" || value === "[N/A]")
        return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function optionalNumber(key, value) {
    return value === undefined ? {} : { [key]: value };
}
export function parseNvidiaSmi(output) {
    return output.split(/\r?\n/).flatMap((line) => {
        const values = line.split(",").map((value) => value.trim());
        const [indexText, uuid, name, utilizationText, memoryUsedText, memoryTotalText, temperatureText, powerText, powerLimitText, fanSpeedText, performanceState, graphicsClockText, memoryClockText,] = values;
        if (!name)
            return [];
        const index = finiteNumber(indexText);
        const memoryUsed = finiteNumber(memoryUsedText);
        const memoryTotal = finiteNumber(memoryTotalText);
        return [
            {
                name,
                vendor: "nvidia",
                source: "nvidia-smi",
                ...(index === undefined ? {} : { index }),
                ...(uuid && uuid !== "N/A" ? { uuid } : {}),
                ...optionalNumber("utilization", finiteNumber(utilizationText)),
                ...optionalNumber("memoryUsed", memoryUsed === undefined ? undefined : memoryUsed * MEBIBYTE),
                ...optionalNumber("memoryTotal", memoryTotal === undefined ? undefined : memoryTotal * MEBIBYTE),
                ...optionalNumber("temperature", finiteNumber(temperatureText)),
                ...optionalNumber("power", finiteNumber(powerText)),
                ...optionalNumber("powerLimit", finiteNumber(powerLimitText)),
                ...optionalNumber("fanSpeed", finiteNumber(fanSpeedText)),
                ...(performanceState && performanceState !== "N/A"
                    ? { performanceState }
                    : {}),
                ...optionalNumber("graphicsClock", finiteNumber(graphicsClockText)),
                ...optionalNumber("memoryClock", finiteNumber(memoryClockText)),
            },
        ];
    });
}
export async function getNvidiaGpus(runner, timeoutMs = 3_000) {
    try {
        const output = await runner("nvidia-smi", [
            "--query-gpu=index,uuid,name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,power.limit,fan.speed,pstate,clocks.current.graphics,clocks.current.memory",
            "--format=csv,noheader,nounits",
        ], timeoutMs);
        return parseNvidiaSmi(output);
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=nvidia.js.map