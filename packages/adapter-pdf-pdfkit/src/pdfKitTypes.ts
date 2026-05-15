export type PdfKitFontSource = string | Uint8Array | ArrayBuffer;

export interface PdfKitTextOptions {
  readonly width?: number;
  readonly height?: number;
  readonly ellipsis?: boolean;
}

export interface PdfKitDocumentLike {
  registerFont?(name: string, source: PdfKitFontSource): this;
  font(name: string): this;
  fontSize(size: number): this;
  fillColor(color: string): this;
  lineWidth(width: number): this;
  rect(x: number, y: number, width: number, height: number): this;
  fill(color?: string): this;
  stroke(color?: string): this;
  text(text: string, x: number, y: number, options?: PdfKitTextOptions): this;
  addPage?(): this;
  end(): void;
  on(event: "data", listener: (chunk: Uint8Array | ArrayBuffer | string) => void): this;
  on(event: "end", listener: () => void): this;
  on(event: "error", listener: (error: Error) => void): this;
}

export interface PdfKitFontOptions {
  readonly regular?: PdfKitFontSource;
  readonly bold?: PdfKitFontSource;
  readonly regularName?: string;
  readonly boldName?: string;
}
