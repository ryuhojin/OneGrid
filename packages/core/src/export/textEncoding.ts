export function encodeUtf8(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }
    appendCodePoint(bytes, codePoint);
  }
  return new Uint8Array(bytes);
}

export function decodeUtf8(bytes: Uint8Array): string {
  let output = "";
  for (let index = 0; index < bytes.length;) {
    const first = bytes[index] ?? 0;
    if (first < 0x80) {
      output += String.fromCodePoint(first);
      index += 1;
    } else if (first < 0xe0) {
      output += String.fromCodePoint(((first & 0x1f) << 6) | ((bytes[index + 1] ?? 0) & 0x3f));
      index += 2;
    } else if (first < 0xf0) {
      output += String.fromCodePoint(
        ((first & 0x0f) << 12)
        | (((bytes[index + 1] ?? 0) & 0x3f) << 6)
        | ((bytes[index + 2] ?? 0) & 0x3f)
      );
      index += 3;
    } else {
      output += String.fromCodePoint(
        ((first & 0x07) << 18)
        | (((bytes[index + 1] ?? 0) & 0x3f) << 12)
        | (((bytes[index + 2] ?? 0) & 0x3f) << 6)
        | ((bytes[index + 3] ?? 0) & 0x3f)
      );
      index += 4;
    }
  }
  return output;
}

function appendCodePoint(bytes: number[], codePoint: number): void {
  if (codePoint < 0x80) {
    bytes.push(codePoint);
  } else if (codePoint < 0x800) {
    bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
  } else if (codePoint < 0x10000) {
    bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
  } else {
    bytes.push(
      0xf0 | (codePoint >> 18),
      0x80 | ((codePoint >> 12) & 0x3f),
      0x80 | ((codePoint >> 6) & 0x3f),
      0x80 | (codePoint & 0x3f)
    );
  }
}
