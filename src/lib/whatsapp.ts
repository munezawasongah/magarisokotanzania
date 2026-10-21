import { toMsisdn } from "./phone";
import { formatTzs, type MoneyInput } from "./money";

export function whatsappLink(phoneE164: string, message: string): string {
  return `https://wa.me/${toMsisdn(phoneE164)}?text=${encodeURIComponent(message)}`;
}

export function listingWhatsappMessage(opts: {
  title: string;
  priceTzs: MoneyInput;
  url: string;
  locale?: "en" | "sw";
}): string {
  if (opts.locale === "sw") {
    return `Habari, nimeona tangazo lako kwenye MagariSOKO Tanzania: "${opts.title}" (${formatTzs(opts.priceTzs)}). Je, bado linapatikana?\n${opts.url}`;
  }
  return `Hello, I saw your listing on MagariSOKO Tanzania: "${opts.title}" (${formatTzs(opts.priceTzs)}). Is it still available?\n${opts.url}`;
}

export function partWhatsappMessage(opts: { title: string; partNumber?: string | null; url: string; locale?: "en" | "sw" }) {
  const pn = opts.partNumber ? ` [${opts.partNumber}]` : "";
  return opts.locale === "sw"
    ? `Habari, nauliza kuhusu kipuri "${opts.title}"${pn} kwenye MagariSOKO Tanzania. Kipo?\n${opts.url}`
    : `Hello, I'm asking about the part "${opts.title}"${pn} on MagariSOKO Tanzania. Is it in stock?\n${opts.url}`;
}
