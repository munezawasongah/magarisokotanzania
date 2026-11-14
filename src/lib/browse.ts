import { BodyType } from "@/generated/prisma/enums";

/** Clean URLs for body types: SUV → "suv", THREE_WHEELER → "three-wheeler". */
export const bodySlug = (b: BodyType | string) => b.toLowerCase().replace(/_/g, "-");
export function bodyFromSlug(slug: string): BodyType | null {
  const v = slug.toUpperCase().replace(/-/g, "_");
  return (Object.values(BodyType) as string[]).includes(v) ? (v as BodyType) : null;
}

/** Landing-page URLs (make, body type, town) used across the site. */
export const browseHref = {
  make: (slug: string) => `/cars/make/${slug}`,
  body: (b: BodyType | string) => `/cars/body/${bodySlug(b)}`,
  region: (slug: string) => `/cars/in/${slug}`,
};
