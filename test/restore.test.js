const assert = require("node:assert/strict");
const test = require("node:test");

const {normalizeSubPackage} = require("../wuConfig.js");
const {parsePureData} = require("../wuWxss.js");

test("normalizes subpackage roots and removes their pages from the main list", () => {
    const mainPages = ["pages/home", "feature/list", "feature/detail"];
    const normalized = normalizeSubPackage({
        root: "/feature",
        pages: ["feature/list", "detail"],
        independent: true
    }, mainPages);

    assert.deepEqual(normalized, {
        root: "feature/",
        pages: ["list", "detail"],
        independent: true
    });
    assert.deepEqual(mainPages, ["pages/home"]);
});

test("keeps malformed subpackage metadata but replaces pages with an empty array", () => {
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = message => warnings.push(message);
    try {
        const normalized = normalizeSubPackage({root: "feature", pages: null, independent: true}, ["pages/home"], 2);
        assert.deepEqual(normalized, {root: "feature/", pages: [], independent: true});
        assert.match(warnings[0], /subPackages\[2\]\.pages/);
    } finally {
        console.warn = originalWarn;
    }
});

test("parses generated _C style tables without appending an unmatched brace", () => {
    const result = parsePureData("ignored();\nvar _C= [[\"page { color: red; }\"]];\nnext();");
    assert.deepEqual(JSON.parse(JSON.stringify(result)), [["page { color: red; }"]]);
});
