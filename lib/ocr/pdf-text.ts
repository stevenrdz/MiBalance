import { inflateSync } from "node:zlib";

type CMap = Map<number, string>;

function extractStreams(buffer: Buffer) {
  const source = buffer.toString("latin1");
  const streams: Buffer[] = [];
  const pattern = /stream\r?\n/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    const start = match.index + match[0].length;
    const end = source.indexOf("endstream", start);
    if (end === -1) break;
    streams.push(buffer.subarray(start, end));
    pattern.lastIndex = end + "endstream".length;
  }

  return streams;
}

function inflatePdfStream(stream: Buffer) {
  const variants = [stream, stream.subarray(1), stream.subarray(2)].filter((item) => item.length > 0);
  for (const variant of variants) {
    try {
      return inflateSync(variant);
    } catch {
      continue;
    }
  }
  return null;
}

function parseHex(value: string) {
  return Number.parseInt(value, 16);
}

function buildCMap(text: string) {
  const map: CMap = new Map();
  const bfcharPattern = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
  let charMatch: RegExpExecArray | null;
  while ((charMatch = bfcharPattern.exec(text))) {
    const from = parseHex(charMatch[1]);
    const to = Buffer.from(charMatch[2], "hex");
    let decoded = "";
    if (to.length >= 2 && to.length % 2 === 0) {
      for (let index = 0; index < to.length; index += 2) {
        decoded += String.fromCodePoint(to.readUInt16BE(index));
      }
    } else {
      decoded = to.toString("latin1");
    }
    if (decoded) map.set(from, decoded);
  }

  const rangePattern = /<([0-9A-Fa-f]+)><([0-9A-Fa-f]+)><([0-9A-Fa-f]+)>/g;
  let match: RegExpExecArray | null;
  while ((match = rangePattern.exec(text))) {
    const from = parseHex(match[1]);
    const to = parseHex(match[2]);
    let current = parseHex(match[3]);
    for (let code = from; code <= to; code += 1) {
      map.set(code, String.fromCodePoint(current));
      current += 1;
    }
  }
  return map;
}

function unescapePdfLiteral(value: string) {
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char !== "\\") {
      result += char;
      continue;
    }

    const next = value[index + 1];
    if (!next) break;
    if (next >= "0" && next <= "7") {
      const octal = value.slice(index + 1, index + 4).match(/^[0-7]{1,3}/)?.[0] ?? "";
      if (octal) {
        result += String.fromCharCode(Number.parseInt(octal, 8));
        index += octal.length;
        continue;
      }
    }

    const replacements: Record<string, string> = {
      n: "\n",
      r: "\r",
      t: "\t",
      b: "\b",
      f: "\f",
      "(": "(",
      ")": ")",
      "\\": "\\"
    };
    result += replacements[next] ?? next;
    index += 1;
  }
  return result;
}

function decodeTextBytes(input: string, cmap: CMap) {
  const bytes = Buffer.from(input, "latin1");
  if (bytes.length >= 2 && bytes.some((byte) => byte === 0)) {
    let decoded = "";
    for (let index = 0; index < bytes.length - 1; index += 2) {
      const code = bytes.readUInt16BE(index);
      decoded += cmap.get(code) ?? "";
    }
    return decoded;
  }
  return unescapePdfLiteral(input);
}

function decodeHexText(input: string, cmap: CMap) {
  const bytes = Buffer.from(input.replace(/\s+/g, ""), "hex");
  if (bytes.length >= 2 && bytes.length % 2 === 0) {
    let decoded = "";
    for (let index = 0; index < bytes.length; index += 2) {
      const code = bytes.readUInt16BE(index);
      decoded += cmap.get(code) ?? String.fromCodePoint(code);
    }
    return decoded;
  }
  return bytes.toString("latin1");
}

function compactSpacedText(text: string) {
  return text
    .replace(/(?:\b[A-Za-z0-9]\b\s*){3,}/g, (match) => match.replace(/\s+/g, ""))
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function extractPdfText(buffer: Buffer) {
  const streams = extractStreams(buffer);
  const inflated = streams
    .map((stream) => inflatePdfStream(stream))
    .filter((stream) => Boolean(stream)) as Buffer[];

  const cmap = inflated
    .map((stream) => stream.toString("latin1"))
    .filter((text) => text.includes("begincmap"))
    .map((text) => buildCMap(text))[0] ?? new Map<number, string>();

  const chunks: string[] = [];
  inflated.forEach((stream) => {
    const text = stream.toString("latin1");
    if (!text.includes("Tj") && !text.includes("TJ")) return;

    const literalPattern = /\((?:\\.|[^\\)])*\)\s*Tj/g;
    for (const match of text.matchAll(literalPattern)) {
      const raw = match[0].slice(1, match[0].lastIndexOf(")"));
      const decoded = compactSpacedText(decodeTextBytes(raw, cmap));
      if (decoded) chunks.push(decoded);
    }

    const hexPattern = /<([0-9A-Fa-f\s]+)>\s*Tj/g;
    for (const match of text.matchAll(hexPattern)) {
      const decoded = compactSpacedText(decodeHexText(match[1], cmap));
      if (decoded) chunks.push(decoded);
    }

    const arrayPattern = /\[(.*?)\]\s*TJ/gs;
    for (const match of text.matchAll(arrayPattern)) {
      const segment = match[1];
      const parts: string[] = [];

      for (const literal of segment.matchAll(/\((?:\\.|[^\\)])*\)/g)) {
        const raw = literal[0].slice(1, -1);
        const decoded = compactSpacedText(decodeTextBytes(raw, cmap));
        if (decoded) parts.push(decoded);
      }

      for (const hex of segment.matchAll(/<([0-9A-Fa-f\s]+)>/g)) {
        const decoded = compactSpacedText(decodeHexText(hex[1], cmap));
        if (decoded) parts.push(decoded);
      }

      const joined = compactSpacedText(parts.join(" "));
      if (joined) chunks.push(joined);
    }
  });

  if (chunks.length === 0) {
    const fallback = buffer.toString("latin1").match(/[\x20-\x7E]{8,}/g) ?? [];
    return fallback.join("\n");
  }

  return chunks.join("\n");
}
