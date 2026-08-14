const {VM} = require("vm2");

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_BUFFER_LIMIT_MB = 32;

function readIntegerSetting(name, fallback, minimum, maximum) {
    const raw = process.env[name];
    if (raw === undefined || raw === "") return fallback;

    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
    }
    return value;
}

function sandboxSettings() {
    const timeout = readIntegerSetting("WXAPP_VM_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, 100, 60_000);
    const bufferLimitMb = readIntegerSetting("WXAPP_VM_BUFFER_LIMIT_MB", DEFAULT_BUFFER_LIMIT_MB, 1, 256);
    return {
        timeout,
        bufferAllocLimit: bufferLimitMb * 1024 * 1024,
        allowAsync: false
    };
}

function createVM(sandbox = {}, options = {}) {
    return new VM({
        ...sandboxSettings(),
        ...options,
        allowAsync: false,
        sandbox
    });
}

module.exports = {
    DEFAULT_BUFFER_LIMIT_MB,
    DEFAULT_TIMEOUT_MS,
    createVM,
    readIntegerSetting,
    sandboxSettings
};
