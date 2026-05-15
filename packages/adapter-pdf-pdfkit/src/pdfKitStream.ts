import type { PdfKitDocumentLike } from "./pdfKitTypes.js";

export function collectPdfKitDocument(
  document: PdfKitDocumentLike,
  draw: () => void
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const done = new Promise<Uint8Array>((resolve, reject) => {
    document.on("data", (chunk) => {
      chunks.push(toUint8Array(chunk));
    });
    document.on("end", () => {
      resolve(concat(chunks));
    });
    document.on("error", reject);
  });
  draw();
  document.end();
  return done;
}

function toUint8Array(chunk: Uint8Array | ArrayBuffer | string): Uint8Array {
  if (typeof chunk === "string") {
    return encodeUtf8(chunk);
  }
  return chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
}

function concat(chunks: readonly Uint8Array[]): Uint8Array {
  const length = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function encodeUtf8(value: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x7f) {
      bytes.push(code);
    } else if (code <= 0x7ff) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code <= 0xffff) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}
