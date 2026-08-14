const assert = require("node:assert/strict");
const test = require("node:test");

const {
    DEFAULT_BUFFER_LIMIT_MB,
    DEFAULT_TIMEOUT_MS,
    createVM,
    sandboxSettings
} = require("../wuSandbox.js");

test("uses documented sandbox defaults", () => {
    const oldTimeout = process.env.WXAPP_VM_TIMEOUT_MS;
    const oldBuffer = process.env.WXAPP_VM_BUFFER_LIMIT_MB;
    delete process.env.WXAPP_VM_TIMEOUT_MS;
    delete process.env.WXAPP_VM_BUFFER_LIMIT_MB;
    try {
        assert.deepEqual(sandboxSettings(), {
            timeout: DEFAULT_TIMEOUT_MS,
            bufferAllocLimit: DEFAULT_BUFFER_LIMIT_MB * 1024 * 1024,
            allowAsync: false
        });
    } finally {
        if (oldTimeout === undefined) delete process.env.WXAPP_VM_TIMEOUT_MS;
        else process.env.WXAPP_VM_TIMEOUT_MS = oldTimeout;
        if (oldBuffer === undefined) delete process.env.WXAPP_VM_BUFFER_LIMIT_MB;
        else process.env.WXAPP_VM_BUFFER_LIMIT_MB = oldBuffer;
    }
});

test("validates sandbox environment overrides", () => {
    const old = process.env.WXAPP_VM_TIMEOUT_MS;
    process.env.WXAPP_VM_TIMEOUT_MS = "not-a-number";
    try {
        assert.throws(() => sandboxSettings(), /WXAPP_VM_TIMEOUT_MS/);
    } finally {
        if (old === undefined) delete process.env.WXAPP_VM_TIMEOUT_MS;
        else process.env.WXAPP_VM_TIMEOUT_MS = old;
    }
});

test("stops non-terminating scripts", () => {
    assert.throws(() => createVM({}, {timeout: 20}).run("while (true) {}"), /timed out/);
});

test("limits individual Buffer allocations", () => {
    const old = process.env.WXAPP_VM_BUFFER_LIMIT_MB;
    process.env.WXAPP_VM_BUFFER_LIMIT_MB = "1";
    try {
        assert.throws(() => createVM({}).run("Buffer.alloc(2 * 1024 * 1024)"), /Buffer allocation/i);
    } finally {
        if (old === undefined) delete process.env.WXAPP_VM_BUFFER_LIMIT_MB;
        else process.env.WXAPP_VM_BUFFER_LIMIT_MB = old;
    }
});
