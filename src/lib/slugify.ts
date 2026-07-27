/**
 * Erzeugt aus einer Bezeichnung eine technische Kennung:
 * kleingeschrieben, Umlaute umgeschrieben, Sonderzeichen zu Bindestrichen.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Hängt bei Kollision eine Zahl an (name, name-2, name-3 …). */
export function uniqueSlug(base: string, taken: string[]): string {
  const clean = base || "behandlung";
  const set = new Set(taken);
  if (!set.has(clean)) return clean;
  let n = 2;
  while (set.has(`${clean}-${n}`)) n += 1;
  return `${clean}-${n}`;
}
