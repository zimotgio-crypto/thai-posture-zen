// Client-side ad image rendering on <canvas>. No server-side image libraries.

export type AdFormatKey = "feed" | "portrait" | "story";
export type AdTemplateKey = "ruhig" | "angebot" | "story";
export type AdTextPosition = "oben" | "mittig" | "unten";

export const AD_FORMATS: { key: AdFormatKey; width: number; height: number; label: string }[] = [
  { key: "feed", width: 1080, height: 1080, label: "1080 × 1080" },
  { key: "portrait", width: 1080, height: 1350, label: "1080 × 1350" },
  { key: "story", width: 1080, height: 1920, label: "1080 × 1920" },
];

export const AD_TEMPLATES: AdTemplateKey[] = ["ruhig", "angebot", "story"];

// Einheitliches Design: Schwarz, Gold, Beige.
const COLORS = {
  ivory: "#F6F1E7",
  ivorySoft: "rgba(246,241,231,0.82)",
  gold: "#C9A55C",
  charcoal: "#141210",
};

export type AdCreativeInput = {
  imageUrl: string | null;
  headline: string;
  subline: string;
  code: string;
  cta: string;
  position: AdTextPosition;
  /** 0…1 – Stärke der Abdunklung hinter dem Text. */
  overlay: number;
  template: AdTemplateKey;
  studioName: string;
  studioCity: string;
};

const FONT_SERIF = "Cormorant Garamond";
const FONT_SANS = "Inter";

let fontsPromise: Promise<void> | null = null;

/** Lädt die verwendeten Schriften explizit, damit das Ergebnis überall gleich aussieht. */
export function ensureAdFonts(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (!fontsPromise) {
    const specs = [
      `300 100px "${FONT_SERIF}"`,
      `400 100px "${FONT_SERIF}"`,
      `500 100px "${FONT_SERIF}"`,
      `600 100px "${FONT_SERIF}"`,
      `300 100px "${FONT_SANS}"`,
      `400 100px "${FONT_SANS}"`,
      `500 100px "${FONT_SANS}"`,
      `600 100px "${FONT_SANS}"`,
    ];
    fontsPromise = Promise.all(specs.map((s) => document.fonts.load(s).catch(() => null)))
      .then(() => document.fonts.ready)
      .then(() => undefined);
  }
  return fontsPromise;
}

const imageCache = new Map<string, HTMLImageElement>();

export function loadAdImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url);
  if (cached?.complete && cached.naturalWidth > 0) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = url;
  });
}

/** Zeichnet formatfüllend, Seitenverhältnis wahrend, mittig beschnitten. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
): void {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) current = next;
    else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) break;
    }
  }
  lines.push(current);
  return lines.slice(0, maxLines);
}

type Metrics = {
  headlineSize: number;
  sublineSize: number;
  ctaSize: number;
  codeSize: number;
  gap: number;
  overlayScale: number;
};

function metricsFor(template: AdTemplateKey, h: number): Metrics {
  const u = h / 1080;
  if (template === "angebot") {
    return {
      headlineSize: 104 * u,
      sublineSize: 44 * u,
      ctaSize: 30 * u,
      codeSize: 40 * u,
      gap: 30 * u,
      overlayScale: 1.15,
    };
  }
  if (template === "story") {
    return {
      headlineSize: 78 * u,
      sublineSize: 34 * u,
      ctaSize: 26 * u,
      codeSize: 32 * u,
      gap: 26 * u,
      overlayScale: 0.85,
    };
  }
  return {
    headlineSize: 62 * u,
    sublineSize: 28 * u,
    ctaSize: 22 * u,
    codeSize: 26 * u,
    gap: 20 * u,
    overlayScale: 0.9,
  };
}

/** Standard-Textposition je Vorlage. */
export function defaultPositionFor(template: AdTemplateKey): AdTextPosition {
  if (template === "angebot") return "mittig";
  if (template === "story") return "oben";
  return "unten";
}

export async function renderAdCreative(
  canvas: HTMLCanvasElement,
  format: { width: number; height: number },
  input: AdCreativeInput,
): Promise<void> {
  const { width: w, height: h } = format;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  await ensureAdFonts();

  ctx.fillStyle = COLORS.charcoal;
  ctx.fillRect(0, 0, w, h);

  if (input.imageUrl) {
    try {
      const img = await loadAdImage(input.imageUrl);
      drawCover(ctx, img, w, h);
    } catch {
      /* Motiv nicht ladbar – dunkler Grund bleibt bestehen */
    }
  }

  const m = metricsFor(input.template, h);
  const margin = Math.round(w * 0.09);
  const maxWidth = w - margin * 2;

  ctx.textBaseline = "top";
  ctx.font = `300 ${m.headlineSize}px "${FONT_SERIF}", Georgia, serif`;
  const headlineLines = wrap(ctx, input.headline, maxWidth, 3);
  ctx.font = `300 ${m.sublineSize}px "${FONT_SANS}", sans-serif`;
  const sublineLines = wrap(ctx, input.subline, maxWidth, 2);

  const headlineH = headlineLines.length * m.headlineSize * 1.08;
  const sublineH = sublineLines.length * m.sublineSize * 1.4;
  const codeH = input.code.trim() ? m.codeSize * 1.9 + m.gap * 0.8 : 0;
  const ctaH = input.cta.trim() ? m.ctaSize * 1.6 + m.gap * 0.6 : 0;
  const blockH = headlineH + (sublineLines.length ? m.gap + sublineH : 0) + codeH + ctaH;

  const footerH = Math.round(h * 0.05);
  let top: number;
  if (input.position === "oben") top = margin * 1.1;
  else if (input.position === "mittig") top = Math.max(margin, (h - blockH) / 2);
  else top = Math.max(margin, h - margin - footerH - blockH);

  const strength = Math.max(0, Math.min(1, input.overlay)) * m.overlayScale;
  const pad = Math.round(h * 0.16);
  const gStart = Math.max(0, top - pad);
  const gEnd = Math.min(h, top + blockH + pad + (input.position === "unten" ? footerH : 0));
  const grad = ctx.createLinearGradient(0, gStart, 0, gEnd);
  const a = (v: number) => `rgba(20,18,16,${(strength * v).toFixed(3)})`;
  if (input.position === "oben") {
    grad.addColorStop(0, a(1));
    grad.addColorStop(0.7, a(0.75));
    grad.addColorStop(1, a(0));
  } else if (input.position === "unten") {
    grad.addColorStop(0, a(0));
    grad.addColorStop(0.3, a(0.75));
    grad.addColorStop(1, a(1));
  } else {
    grad.addColorStop(0, a(0));
    grad.addColorStop(0.35, a(0.95));
    grad.addColorStop(0.65, a(0.95));
    grad.addColorStop(1, a(0));
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, gStart, w, gEnd - gStart);

  ctx.textAlign = "center";
  const cx = w / 2;
  let y = top;

  ctx.fillStyle = COLORS.ivory;
  ctx.font = `300 ${m.headlineSize}px "${FONT_SERIF}", Georgia, serif`;
  for (const line of headlineLines) {
    ctx.fillText(line, cx, y);
    y += m.headlineSize * 1.08;
  }

  if (sublineLines.length) {
    y += m.gap;
    ctx.fillStyle = COLORS.ivorySoft;
    ctx.font = `${input.template === "angebot" ? 500 : 300} ${m.sublineSize}px "${FONT_SANS}", sans-serif`;
    for (const line of sublineLines) {
      ctx.fillText(line, cx, y);
      y += m.sublineSize * 1.4;
    }
  }

  if (input.code.trim()) {
    y += m.gap * 0.8;
    const label = input.code.trim().toUpperCase();
    ctx.font = `500 ${m.codeSize}px "${FONT_SANS}", sans-serif`;
    ctx.letterSpacing = `${(m.codeSize * 0.14).toFixed(1)}px`;
    const textW = ctx.measureText(label).width;
    const boxW = Math.min(maxWidth, textW + m.codeSize * 2);
    const boxH = m.codeSize * 1.9;
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = Math.max(1, m.codeSize * 0.05);
    ctx.strokeRect(cx - boxW / 2, y, boxW, boxH);
    ctx.fillStyle = COLORS.gold;
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, y + boxH / 2);
    ctx.textBaseline = "top";
    ctx.letterSpacing = "0px";
    y += boxH;
  }

  if (input.cta.trim()) {
    y += m.gap * 0.9;
    ctx.fillStyle = COLORS.ivory;
    ctx.font = `500 ${m.ctaSize}px "${FONT_SANS}", sans-serif`;
    ctx.letterSpacing = `${(m.ctaSize * 0.22).toFixed(1)}px`;
    ctx.fillText(input.cta.trim().toUpperCase(), cx, y);
    ctx.letterSpacing = "0px";
  }

  const footer = [input.studioName, input.studioCity].filter(Boolean).join(" · ");
  if (footer) {
    const size = Math.round(h * 0.0155);
    ctx.font = `400 ${size}px "${FONT_SANS}", sans-serif`;
    ctx.letterSpacing = `${(size * 0.3).toFixed(1)}px`;
    ctx.fillStyle = "rgba(246,241,231,0.72)";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(footer.toUpperCase(), cx, h - margin * 0.55);
    ctx.letterSpacing = "0px";
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("blob-failed"))), "image/png");
  });
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function canvasToBase64(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await canvasToBlob(canvas);
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buffer.length; i += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}