import { decodeUtf8, encodeUtf8 } from "./textEncoding.js";

export interface ZipEntry {
  readonly name: string;
  readonly data: Uint8Array;
}

interface CentralEntry {
  readonly name: string;
  readonly data: Uint8Array;
  readonly crc: number;
  readonly offset: number;
}

const CRC_TABLE = createCrcTable();

export function createZip(entries: readonly ZipEntry[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: CentralEntry[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encodeUtf8(entry.name);
    const crc = crc32(entry.data);
    const local = concatBytes([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(entry.data.length), u32(entry.data.length),
      u16(name.length), u16(0), name, entry.data
    ]);
    chunks.push(local);
    central.push({ ...entry, crc, offset });
    offset += local.length;
  }

  const centralOffset = offset;
  const centralBytes = central.map((entry) => createCentralDirectoryEntry(entry));
  const centralSize = centralBytes.reduce((sum, entry) => sum + entry.length, 0);
  const end = concatBytes([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralSize), u32(centralOffset), u16(0)
  ]);

  return concatBytes([...chunks, ...centralBytes, end]);
}

export function readZip(data: Uint8Array): ReadonlyMap<string, Uint8Array> {
  const entries = new Map<string, Uint8Array>();
  let offset = 0;
  while (offset + 30 <= data.length && readU32(data, offset) === 0x04034b50) {
    const method = readU16(data, offset + 8);
    const compressedSize = readU32(data, offset + 18);
    const uncompressedSize = readU32(data, offset + 22);
    const nameLength = readU16(data, offset + 26);
    const extraLength = readU16(data, offset + 28);
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    const contentEnd = contentStart + compressedSize;
    if (method !== 0 || compressedSize !== uncompressedSize || contentEnd > data.length) {
      break;
    }
    const name = decodeUtf8(data.slice(nameStart, nameStart + nameLength));
    entries.set(name, data.slice(contentStart, contentEnd));
    offset = contentEnd;
  }
  return entries;
}

function createCentralDirectoryEntry(entry: CentralEntry): Uint8Array {
  const name = encodeUtf8(entry.name);
  return concatBytes([
    u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
    u32(entry.crc), u32(entry.data.length), u32(entry.data.length),
    u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(entry.offset), name
  ]);
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable(): readonly number[] {
  return Object.freeze(Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  }));
}

function u16(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff
  ]);
}

function readU16(data: Uint8Array, offset: number): number {
  return (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8);
}

function readU32(data: Uint8Array, offset: number): number {
  return readU16(data, offset) | (readU16(data, offset + 2) << 16);
}

function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}
