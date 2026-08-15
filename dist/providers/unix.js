export function parseDf(output, blockSize) {
    return output
        .split(/\r?\n/)
        .slice(1)
        .flatMap((line) => {
        const match = line.match(/^\S+\s+(\d+)\s+\d+\s+(\d+)\s+\S+\s+(.+)$/);
        if (!match)
            return [];
        const size = Number(match[1]) * blockSize;
        const free = Number(match[2]) * blockSize;
        const mount = match[3];
        if (!mount || !Number.isFinite(size) || !Number.isFinite(free))
            return [];
        return [{ mount, size, free }];
    });
}
//# sourceMappingURL=unix.js.map