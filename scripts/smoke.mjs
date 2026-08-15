import assert from "node:assert/strict";
import { getSystemStatus } from "../dist/index.js";

const status = await getSystemStatus({ cpuSampleMs: 0 });

assert.equal(status.platform, process.platform);
assert.ok(status.cpu.logicalProcessors > 0);
assert.ok(status.memory.total > 0);
assert.ok(status.memory.used >= 0);
assert.ok(Array.isArray(status.disks));
assert.ok(Array.isArray(status.gpus));
