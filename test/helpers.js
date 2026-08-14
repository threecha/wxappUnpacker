const path = require("path");

const HEADER_LENGTH = 14;

function createWxapkg(entries) {
    const normalized = entries.map(entry => ({
        name: entry.name,
        data: Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data)
    }));
    const encodedNames = normalized.map(entry => Buffer.from(entry.name, "utf8"));
    const infoListLength = 4 + encodedNames.reduce((total, name) => total + 4 + name.length + 8, 0);
    const dataLength = normalized.reduce((total, entry) => total + entry.data.length, 0);
    const dataStart = HEADER_LENGTH + infoListLength;

    const header = Buffer.alloc(HEADER_LENGTH);
    header.writeUInt8(0xbe, 0);
    header.writeUInt32BE(0, 1);
    header.writeUInt32BE(infoListLength, 5);
    header.writeUInt32BE(dataLength, 9);
    header.writeUInt8(0xed, 13);

    const list = Buffer.alloc(infoListLength);
    list.writeUInt32BE(normalized.length, 0);
    let listOffset = 4;
    let dataOffset = dataStart;
    for (let index = 0; index < normalized.length; index++) {
        const name = encodedNames[index];
        const entry = normalized[index];
        list.writeUInt32BE(name.length, listOffset);
        listOffset += 4;
        name.copy(list, listOffset);
        listOffset += name.length;
        list.writeUInt32BE(dataOffset, listOffset);
        listOffset += 4;
        list.writeUInt32BE(entry.data.length, listOffset);
        listOffset += 4;
        dataOffset += entry.data.length;
    }

    return Buffer.concat([header, list, ...normalized.map(entry => entry.data)]);
}

function outputDirectoryFor(packagePath) {
    return path.resolve(packagePath, "..", path.basename(packagePath, ".wxapkg"));
}

module.exports = {createWxapkg, outputDirectoryFor};
