// Minimal header parser for image dimensions. Runs on the Worker runtime,
// so no native image libraries (sharp/canvas) are available.
export type ImageSize = { width: number; height: number } | null;

export function readImageSize(bytes: Uint8Array): ImageSize {
  return readPng(bytes) ?? readWebp(bytes) ?? readJpeg(bytes);
}

function u32(b: Uint8Array, o: number) {
  return (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3];
}

function readPng(b: Uint8Array): ImageSize {
  if (b.length < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!sig.every((v, i) => b[i] === v)) return null;
  return { width: u32(b, 16) >>> 0, height: u32(b, 20) >>> 0 };
}

function readJpeg(b: Uint8Array): ImageSize {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = b[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = (b[i + 2] << 8) | b[i + 3];
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      const height = (b[i + 5] << 8) | b[i + 6];
      const width = (b[i + 7] << 8) | b[i + 8];
      return { width, height };
    }
    i += 2 + len;
  }
  return null;
}

function readWebp(b: Uint8Array): ImageSize {
  if (b.length < 30) return null;
  const tag = (o: number, s: string) =>
    s.split("").every((c, i) => b[o + i] === c.charCodeAt(0));
  if (!tag(0, "RIFF") || !tag(8, "WEBP")) return null;
  if (tag(12, "VP8X")) {
    const width = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
    const height = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
    return { width, height };
  }
  if (tag(12, "VP8L")) {
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (tag(12, "VP8 ")) {
    return {
      width: ((b[26] | (b[27] << 8)) & 0x3fff),
      height: ((b[28] | (b[29] << 8)) & 0x3fff),
    };
  }
  return null;
}