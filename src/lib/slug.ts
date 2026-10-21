export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Readable + unique: "2016-toyota-harrier-dar-es-salaam-k3x9qa" */
export function uniqueSlug(...parts: Array<string | number | null | undefined>): string {
  const base = slugify(parts.filter(Boolean).join(" "));
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
