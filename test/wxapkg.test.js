const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawnSync} = require("node:child_process");
const test = require("node:test");

const {
    WxapkgFormatError,
    genList,
    header,
    normalizeArchivePath,
    saveFile
} = require("../wuWxapkg.js");
const {createWxapkg, outputDirectoryFor} = require("./helpers.js");

const entrypoint = path.resolve(__dirname, "..", "wuWxapkg.js");

test("validates a complete wxapkg header and file table", () => {
    const archive = createWxapkg([{name: "/app.json", data: "{}"}]);
    const metadata = header(archive);
    const files = genList(archive, metadata.infoListLength, metadata.dataLength);
    assert.deepEqual(files.map(file => file.name), ["/app.json"]);
});

test("rejects short, encrypted, and length-mismatched packages", () => {
    assert.throws(() => header(Buffer.alloc(13)), WxapkgFormatError);

    const invalidMagic = createWxapkg([{name: "/app.json", data: "{}"}]);
    invalidMagic[0] = 0;
    assert.throws(() => header(invalidMagic), /encrypted, damaged, or use an unsupported format/);

    const invalidLength = createWxapkg([{name: "/app.json", data: "{}"}]);
    invalidLength.writeUInt32BE(99, 9);
    assert.throws(() => header(invalidLength), /length mismatch/);
});

test("rejects truncated file tables and out-of-bounds file data", () => {
    const archive = createWxapkg([{name: "/app.json", data: "{}"}]);
    const metadata = header(archive);
    assert.throws(() => genList(archive, 5, archive.length - 19), /truncated|mismatch/);

    const offsetPosition = 14 + 4 + 4 + Buffer.byteLength("/app.json");
    archive.writeUInt32BE(archive.length + 1, offsetPosition);
    assert.throws(() => genList(archive, metadata.infoListLength, metadata.dataLength), /outside the declared data section/);
});

test("normalizes package-root paths and rejects traversal or OS absolute paths", () => {
    assert.equal(normalizeArchivePath("/pages/home.js"), path.join("pages", "home.js"));
    assert.equal(normalizeArchivePath("pages\\home.js"), path.join("pages", "home.js"));
    for (const unsafe of ["../secret", "/../secret", "a/../../secret", "C:\\secret", "\\\\server\\share", "a//b", "./a"]) {
        assert.throws(() => normalizeArchivePath(unsafe), WxapkgFormatError, unsafe);
    }
});

test("detects duplicate output paths before writing", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "wxapp-unpacker-duplicate-"));
    const archive = createWxapkg([
        {name: "/same.txt", data: "one"},
        {name: "same.txt", data: "two"}
    ]);
    const metadata = header(archive);
    const files = genList(archive, metadata.infoListLength, metadata.dataLength);
    assert.throws(() => saveFile(root, archive, files), /duplicate output path/);
    assert.deepEqual(fs.readdirSync(root), []);
});

test("skips byte-identical duplicate output paths", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "wxapp-unpacker-identical-duplicate-"));
    const packagePath = path.join(root, "duplicate.wxapkg");
    fs.writeFileSync(packagePath, createWxapkg([
        {name: "/same.txt", data: "same"},
        {name: "same.txt", data: "same"}
    ]));

    const result = spawnSync(process.execPath, [entrypoint, "--output-only", packagePath], {encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stderr, /Skipping byte-identical duplicate output path/);
    assert.equal(fs.readFileSync(path.join(outputDirectoryFor(packagePath), "same.txt"), "utf8"), "same");
});

test("refuses to write through an existing symbolic link", {skip: process.platform === "win32"}, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "wxapp-unpacker-symlink-"));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "wxapp-unpacker-outside-"));
    fs.symlinkSync(outside, path.join(root, "linked"));
    const archive = createWxapkg([{name: "/linked/secret.txt", data: "secret"}]);
    const metadata = header(archive);
    const files = genList(archive, metadata.infoListLength, metadata.dataLength);
    assert.throws(() => saveFile(root, archive, files), /symbolic link/);
    assert.deepEqual(fs.readdirSync(outside), []);
});

test("CLI unpacks multiple generated packages without executing restored code", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "wxapp-unpacker-cli-"));
    const first = path.join(root, "first.wxapkg");
    const second = path.join(root, "second.wxapkg");
    fs.writeFileSync(first, createWxapkg([{name: "/app.json", data: "{\"name\":\"first\"}"}]));
    fs.writeFileSync(second, createWxapkg([{name: "/nested/value.txt", data: "second"}]));

    const result = spawnSync(process.execPath, [entrypoint, "--output-only", first, second], {encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(fs.readFileSync(path.join(outputDirectoryFor(first), "app.json"), "utf8"), "{\"name\":\"first\"}");
    assert.equal(fs.readFileSync(path.join(outputDirectoryFor(second), "nested", "value.txt"), "utf8"), "second");
});

test("CLI exposes help and version", () => {
    const help = spawnSync(process.execPath, [entrypoint, "--help"], {encoding: "utf8"});
    assert.equal(help.status, 0);
    assert.match(help.stdout, /Command Line Helper/);

    const version = spawnSync(process.execPath, [entrypoint, "--version"], {encoding: "utf8"});
    assert.equal(version.status, 0);
    assert.equal(version.stdout.trim(), "6.8.0");
});
