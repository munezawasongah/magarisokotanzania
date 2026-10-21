/** Mini-site form values, shared by server pages and client forms. */
export type ShopKind = "SELLER" | "DEALER" | "YARD" | "IMPORTER" | "PARTS_VENDOR" | "SERVICE_PROVIDER";
export type ServiceRow = { category: string; title: string; priceFromTzs: string; mobileService: boolean };

export type ShopValues = {
  name: string; tagline: string; description: string; phone: string; whatsapp: string; email: string; website: string;
  regionId: string; districtId: string; address: string; latitude: number | null; longitude: number | null;
  openingHours: string; tin: string; brelaRegNo: string; serviceKind: string; importCountries: string[];
  logoUrl: string; coverUrl: string; services: ServiceRow[];
};

export const emptyShop = (phone = ""): ShopValues => ({
  name: "", tagline: "", description: "", phone, whatsapp: "", email: "", website: "", regionId: "", districtId: "", address: "",
  latitude: null, longitude: null, openingHours: "", tin: "", brelaRegNo: "", serviceKind: "SERVICE_PROVIDER", importCountries: [],
  logoUrl: "", coverUrl: "", services: [],
});


/** Convert a stored shop (server data) to form values. */
export function shopToValues(s: Record<string, unknown> | null | undefined, fallbackPhone = ""): ShopValues {
  if (!s) return emptyShop(fallbackPhone);
  const str = (k: string) => (s[k] === null || s[k] === undefined ? "" : String(s[k]));
  const num = (k: string) => (typeof s[k] === "number" ? (s[k] as number) : null);
  const hours = s.openingHours && typeof s.openingHours === "object" ? String((s.openingHours as { text?: string }).text ?? "") : str("openingHours");
  const services = Array.isArray(s.services)
    ? (s.services as Array<Record<string, unknown>>).map((x) => ({ category: String(x.category), title: String(x.title), priceFromTzs: x.priceFromTzs ? String(x.priceFromTzs) : "", mobileService: !!x.mobileService }))
    : [];
  return {
    name: str("name"), tagline: str("tagline"), description: str("description"), phone: str("phone") || fallbackPhone,
    whatsapp: str("whatsapp") === str("phone") ? "" : str("whatsapp"), email: str("email"), website: str("website"),
    regionId: str("regionId"), districtId: str("districtId"), address: str("address"), latitude: num("latitude"), longitude: num("longitude"),
    openingHours: hours, tin: str("tin"), brelaRegNo: str("brelaRegNo"), serviceKind: str("serviceKind") || (["INSPECTION_CENTER", "FINANCE_INSURANCE"].includes(str("type")) ? str("type") : "SERVICE_PROVIDER"),
    importCountries: Array.isArray(s.importCountries) ? (s.importCountries as string[]) : [], logoUrl: str("logoUrl"), coverUrl: str("coverUrl"), services,
  };
}
