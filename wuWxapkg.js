const wu = require("./wuLib.js");
const wuJs = require("./wuJs.js");
const wuCfg = require("./wuConfig.js");
const wuMl = require("./wuWxml.js");
const wuSs = require("./wuWxss.js");
const path = require("path");
const fs = require("fs");

const HEADER_LENGTH = 14;

class WxapkgFormatError extends Error {
    constructor(message) {
        super(message);
        this.name = "WxapkgFormatError";
        this.code = "ERR_WXAPKG_FORMAT";
    }
}

function header(buf) {
    if (!Buffer.isBuffer(buf) || buf.length < HEADER_LENGTH) {
        throw new WxapkgFormatError(`Package is too short: expected at least ${HEADER_LENGTH} bytes.`);
    }
    console.log("\nHeader info:");
    let firstMark = buf.readUInt8(0);
    console.log("  firstMark: 0x%s", firstMark.toString(16));
    let unknownInfo = buf.readUInt32BE(1);
    console.log("  unknownInfo: ", unknownInfo);
    let infoListLength = buf.readUInt32BE(5);
    console.log("  infoListLength: ", infoListLength);
    let dataLength = buf.readUInt32BE(9);
    console.log("  dataLength: ", dataLength);
    let lastMark = buf.readUInt8(13);
    console.log("  lastMark: 0x%s", lastMark.toString(16));
    if (firstMark !== 0xbe || lastMark !== 0xed) {
        throw new WxapkgFormatError("Invalid wxapkg magic number. The package may be encrypted, damaged, or use an unsupported format.");
    }
    if (infoListLength < 4) {
        throw new WxapkgFormatError("Invalid file-list length: the list must include a file count.");
    }
    const expectedLength = HEADER_LENGTH + infoListLength + dataLength;
    if (expectedLength !== buf.length) {
        throw new WxapkgFormatError(`Package length mismatch: header declares ${expectedLength} bytes, received ${buf.length}.`);
    }
    return {infoListLength, dataLength};
}

function ensureReadable(buf, offset, length, label) {
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > buf.length) {
        throw new WxapkgFormatError(`Invalid ${label}: file-list data is truncated or out of bounds.`);
    }
}

function normalizeArchivePath(name) {
    if (typeof name !== "string" || name.length === 0 || name.includes("\0")) {
        throw new WxapkgFormatError("Archive contains an empty or invalid file name.");
    }
    const portableName = name.replace(/\\/g, "/");
    if (/^[A-Za-z]:/.test(portableName) || portableName.startsWith("//")) {
        throw new WxapkgFormatError(`Archive contains an absolute file path: ${JSON.stringify(name)}.`);
    }

    // wxapkg uses one leading slash as an archive-root marker, not an OS path.
    const relativeName = portableName.startsWith("/") ? portableName.slice(1) : portableName;
    const parts = relativeName.split("/");
    if (parts.length === 0 || parts.some(part => part === "" || part === "." || part === "..")) {
        throw new WxapkgFormatError(`Archive contains an unsafe file path: ${JSON.stringify(name)}.`);
    }
    return parts.join(path.sep);
}

function safeOutputPath(dir, name) {
    const root = path.resolve(dir);
    const target = path.resolve(root, normalizeArchivePath(name));
    const relative = path.relative(root, target);
    if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
        throw new WxapkgFormatError(`Archive path escapes the output directory: ${JSON.stringify(name)}.`);
    }
    return target;
}

function assertNoSymlinkPath(root, target) {
    if (fs.existsSync(root) && fs.lstatSync(root).isSymbolicLink()) {
        throw new WxapkgFormatError(`Refusing to write through a symbolic link: ${root}.`);
    }
    const relativeParts = path.relative(root, target).split(path.sep);
    let current = root;
    for (const part of relativeParts) {
        current = path.join(current, part);
        if (!fs.existsSync(current)) break;
        if (fs.lstatSync(current).isSymbolicLink()) {
            throw new WxapkgFormatError(`Refusing to write through a symbolic link: ${current}.`);
        }
    }
}

function genList(buf, infoListLength, dataLength) {
    console.log("\nFile list info:");
    const listStart = HEADER_LENGTH;
    const listEnd = listStart + infoListLength;
    const dataStart = listEnd;
    const dataEnd = dataStart + dataLength;
    const listBuffer = buf.subarray(listStart, listEnd);
    ensureReadable(listBuffer, 0, 4, "file count");
    let fileCount = listBuffer.readUInt32BE(0);
    console.log("  fileCount: ", fileCount);
    let fileInfo = [], off = 4;
    for (let i = 0; i < fileCount; i++) {
        let info = {};
        ensureReadable(listBuffer, off, 4, `name length for entry ${i}`);
        let nameLen = listBuffer.readUInt32BE(off);
        off += 4;
        ensureReadable(listBuffer, off, nameLen, `name for entry ${i}`);
        info.name = listBuffer.toString('utf8', off, off + nameLen);
        off += nameLen;
        ensureReadable(listBuffer, off, 8, `offset and size for entry ${i}`);
        info.off = listBuffer.readUInt32BE(off);
        off += 4;
        info.size = listBuffer.readUInt32BE(off);
        off += 4;
        if (info.off < dataStart || info.off + info.size > dataEnd) {
            throw new WxapkgFormatError(`File data for ${JSON.stringify(info.name)} is outside the declared data section.`);
        }
        fileInfo.push(info);
    }
    if (off !== listBuffer.length) {
        throw new WxapkgFormatError(`File-list length mismatch: parsed ${off} bytes, declared ${listBuffer.length}.`);
    }
    return fileInfo;
}

function saveFile(dir, buf, list) {
    console.log("Saving files...");
    const targets = new Map();
    const validated = list.map(info => {
        const target = safeOutputPath(dir, info.name);
        assertNoSymlinkPath(path.resolve(dir), target);
        const targetKey = process.platform === "win32" || process.platform === "darwin"
            ? target.normalize("NFC").toLowerCase()
            : target;
        const previous = targets.get(targetKey);
        if (previous) {
            const previousData = buf.subarray(previous.off, previous.off + previous.size);
            const currentData = buf.subarray(info.off, info.off + info.size);
            if (previous.size !== info.size || !previousData.equals(currentData)) {
                throw new WxapkgFormatError(`Archive contains a conflicting duplicate output path: ${JSON.stringify(info.name)}.`);
            }
            console.warn(`Skipping byte-identical duplicate output path: ${JSON.stringify(info.name)}.`);
            return null;
        }
        targets.set(targetKey, info);
        return {info, target};
    }).filter(Boolean);
    for (const {info, target} of validated) {
        wu.save(target, buf.subarray(info.off, info.off + info.size));
    }
}

function packDone(dir, cb, order) {
    console.log("Unpack done.");
    let weappEvent = new wu.CntEvent, needDelete = {};
    weappEvent.encount(4);
    weappEvent.add(() => {
        wu.addIO(() => {
            console.log("Split and make up done.");
            if (!order.includes("d")) {
                console.log("Delete files...");
                wu.addIO(() => console.log("Deleted.\n\nFile done."));
                for (let name in needDelete) if (needDelete[name] >= 8) wu.del(name);
            }
            cb();
        });
    });

    function doBack(deletable) {
        for (let key in deletable) {
            if (!needDelete[key]) needDelete[key] = 0;
            needDelete[key] += deletable[key];//all file have score bigger than 8 will be delete.
        }
        weappEvent.decount();
    }

    function dealThreeThings(dir, mainDir, nowDir) {
        console.log("Split app-service.js and make up configs & wxss & wxml & wxs...");

        //deal config
        if (fs.existsSync(path.resolve(dir, "app-config.json"))) {
            wuCfg.doConfig(path.resolve(dir, "app-config.json"), doBack);
            console.log('deal config ok');
        }
        //deal js
        if (fs.existsSync(path.resolve(dir, "app-service.js"))) {
            wuJs.splitJs(path.resolve(dir, "app-service.js"), doBack, mainDir);
            console.log('deal js ok');
        }
        if (fs.existsSync(path.resolve(dir, "workers.js"))) {
            wuJs.splitJs(path.resolve(dir, "workers.js"), doBack, mainDir);
            console.log('deal js2 ok');
        }
        //deal html
        if (mainDir) {
            if (fs.existsSync(path.resolve(dir, "page-frame.js"))) {
                wuMl.doFrame(path.resolve(dir, "page-frame.js"), doBack, order, mainDir);
                console.log('deal sub html ok');
            }
            wuSs.doWxss(dir, doBack, mainDir, nowDir);
        } else {
            if (fs.existsSync(path.resolve(dir, "page-frame.html"))) {
                wuMl.doFrame(path.resolve(dir, "page-frame.html"), doBack, order, mainDir);
                console.log('deal html ok');
            } else if (fs.existsSync(path.resolve(dir, "app-wxss.js"))) {
                wuMl.doFrame(path.resolve(dir, "app-wxss.js"), doBack, order, mainDir);
                if (!needDelete[path.resolve(dir, "page-frame.js")]) {
                    needDelete[path.resolve(dir, "page-frame.js")] = 8;
                }
                console.log('deal wxss.js ok');
            } else {
                throw Error("page-frame-like file is not found in the package by auto.");
            }
            //Force it run at last, becuase lots of error occured in this part
            wuSs.doWxss(dir, doBack);

            console.log('deal css ok');
        }

    }

//This will be the only func running this time, so async is needless.
    if (fs.existsSync(path.resolve(dir, "app-service.js"))) {
        //weapp
        dealThreeThings(dir);
    } else if (fs.existsSync(path.resolve(dir, "game.js"))) {
        //wegame
        console.log("Split game.js and rewrite game.json...");
        let gameCfg = path.resolve(dir, "app-config.json");
        wu.get(gameCfg, cfgPlain => {
            let cfg = JSON.parse(cfgPlain);
            if (cfg.subContext) {
                console.log("Found subContext, splitting it...")
                delete cfg.subContext;
                let contextPath = path.resolve(dir, "subContext.js");
                wuJs.splitJs(contextPath, () => wu.del(contextPath));
            }
            wu.save(path.resolve(dir, "game.json"), JSON.stringify(cfg, null, 4));
            wu.del(gameCfg);
        });
        wuJs.splitJs(path.resolve(dir, "game.js"), () => {
            wu.addIO(() => {
                console.log("Split and rewrite done.");
                cb();
            });
        });
    } else {//分包
        let doSubPkg = false;
        for (const orderElement of order) {
            if (orderElement.indexOf('s=') !== -1) {
                let mainDir = orderElement.substring(2, orderElement.length);
                console.log("now dir: " + dir);
                console.log("param of mainDir: " + mainDir);

                let findDir = function (dir, oldDir) {
                    let files = fs.readdirSync(dir);
                    for (const file of files) {
                        let workDir = path.join(dir, file);
                        if (fs.existsSync(path.resolve(workDir, "app-service.js"))) {
                            console.log("sub package word dir: " + workDir);
                            mainDir = path.resolve(oldDir, mainDir);
                            console.log("real mainDir: " + mainDir);
                            dealThreeThings(workDir, mainDir, oldDir);
                            doSubPkg = true;
                            return true;
                        } else {
                            findDir(workDir, oldDir);
                        }
                    }

                };

                findDir(dir, dir);

            }
        }
        if (!doSubPkg) {
            throw new Error("This pkg may be a sub pkg, please add -s=Main Dir, like: node wuWxapkg.js -s=./testpkg/test/ ./testpkg/test-pkg-sub.wxapkg");
        }
    }
}

function doFile(name, cb, order) {
    for (let ord of order) if (ord.startsWith("s=")) global.subPack = ord.slice(3);
    console.log("Unpack file " + name + "...");
    let dir = path.resolve(name, "..", path.basename(name, ".wxapkg"));
    wu.get(name, buf => {
        let {infoListLength, dataLength} = header(buf);
        const fileList = genList(buf, infoListLength, dataLength);
        if (order.includes("o")) wu.addIO(() => {
            console.log("Unpack done.");
            cb();
        });
        else wu.addIO(packDone, dir, cb, order);
        saveFile(dir, buf, fileList);
    }, {});
}

module.exports = {
    HEADER_LENGTH,
    WxapkgFormatError,
    assertNoSymlinkPath,
    doFile,
    genList,
    header,
    normalizeArchivePath,
    safeOutputPath,
    saveFile
};
if (require.main === module) {
    wu.commandExecute(doFile, "Unpack a wxapkg file.\n\n[-o] [-d] [-f] [-s=<Main Dir>] <files...>\n\n-d, --keep-intermediate  Do not delete transformed intermediate files.\n-o, --output-only        Do not execute any operation after unpack.\n-f, --fast               Process multiple packages concurrently.\n-s=<Main Dir>            Regard inputs as subpackages of <Main Dir>.\n--main-dir=<Main Dir>    Long form of -s=<Main Dir>.\n-h, --help               Show this help.\n-v, --version            Show the package version.\n<files...>               One or more wxapkg files to unpack.");
}
