const fs = require("fs");
const path = require("path");
const {spawnSync} = require("child_process");

const root = path.resolve(__dirname, "..");
const ignored = new Set([".git", "node_modules"]);

function collectJavaScript(dir, files = []) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        if (ignored.has(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) collectJavaScript(fullPath, files);
        else if (entry.isFile() && entry.name.endsWith(".js")) files.push(fullPath);
    }
    return files;
}

for (const file of collectJavaScript(root)) {
    const result = spawnSync(process.execPath, ["--check", file], {encoding: "utf8"});
    if (result.status !== 0) {
        process.stderr.write(result.stderr || result.stdout);
        process.exit(result.status || 1);
    }
}

console.log("JavaScript syntax check passed.");
