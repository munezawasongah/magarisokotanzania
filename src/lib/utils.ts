import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(path = "/") {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(path, base).toString();
}

export function formatKm(km: number | null | undefined) {
  if (km === null || km === undefined) return "—";
  return `${new Intl.NumberFormat("en-TZ").format(km)} km`;
}

export function timeAgo(date: Date | string, locale: "en" | "sw" = "en") {
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  const units: Array<[number, string, string]> = [
    [31536000, "year", "mwaka"], [2592000, "month", "mwezi"], [604800, "week", "wiki"],
    [86400, "day", "siku"], [3600, "hour", "saa"], [60, "minute", "dakika"],
  ];
  for (const [sec, en, sw] of units) {
    const n = Math.floor(s / sec);
    if (n >= 1) return locale === "sw" ? `${sw} ${n} zilizopita` : `${n} ${en}${n > 1 ? "s" : ""} ago`;
  }
  return locale === "sw" ? "sasa hivi" : "just now";
}

export function hashString(input: string) {
  // non-crypto, for anonymous session/IP bucketing only
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** Insert a Cloudinary transformation into a delivery URL (no-op for other hosts). */
export function cldTransform(url: string, transform = "f_auto,q_auto,c_fill,w_800,h_600") {
  return url.includes("res.cloudinary.com") ? url.replace("/upload/", `/upload/${transform}/`) : url;
}
