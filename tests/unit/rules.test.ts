/**
 * Business rules that must never silently change: prices, phone numbers, the
 * "no listing without a price / mileage" rule, registration details, loan maths.
 */
import { describe, expect, it } from "vitest";
import { formatTzs, parseTzsInput } from "@/lib/money";
import { formatTzPhone, normalizeTzPhone } from "@/lib/phone";
import { listingCreateSchema, listingUpdateSchema, manualPaymentSchema, partCreateSchema, registerSchema, registrationDetailsSchema, shopSchema } from "@/lib/validation";
import { estimateMonthly, monthlyLoanPayment } from "@/lib/import-cost";
import { renderEmail } from "@/lib/email";
import { normaliseSearchQuery } from "@/server/alerts";
import { resetDestination } from "@/server/password-reset";
import { displayName } from "@/server/reviews";

const car = {
  makeId: 1, modelId: 1, year: 2016, condition: "FOREIGN_USED", bodyType: "SUV", transmission: "AUTOMATIC", fuelType: "PETROL",
  mileageKm: "78,000", description: "Clean car, full service history, viewing any day in Dar es Salaam.", priceTzs: "62m", regionId: 1, confirmOwnership: true,
};

describe("money", () => {
  it("reads the ways Tanzanians type prices", () => {
    expect(parseTzsInput("45m")).toBe(45_000_000);
    expect(parseTzsInput("45,000,000")).toBe(45_000_000);
    expect(parseTzsInput("1.5m")).toBe(1_500_000);
    expect(parseTzsInput("")).toBeNull();
  });
  it("formats TZS", () => {
    expect(formatTzs(30_000)).toMatch(/30,000/);
    expect(formatTzs(30_000n)).toMatch(/TSh/);
  });
});

describe("phone numbers", () => {
  it("normalises every local format to +255", () => {
    for (const v of ["0668212595", "668212595", "+255668212595", "255 668 212 595", "0668 212 595"]) expect(normalizeTzPhone(v)).toBe("+255668212595");
  });
  it("rejects non-Tanzanian or short numbers", () => {
    expect(normalizeTzPhone("0724090067123")).toBeNull();
    expect(normalizeTzPhone("12345")).toBeNull();
  });
  it("formats for display", () => expect(formatTzPhone("+255668212595")).toBe("+255 668 212 595"));
});

describe("vehicle listings", () => {
  it("accepts a complete listing", () => {
    const r = listingCreateSchema.safeParse(car);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.priceTzs).toBe(62_000_000);
      expect(r.data.mileageKm).toBe(78_000);
    }
  });
  it("refuses a listing without a price", () => {
    for (const priceTzs of ["", "0", undefined]) expect(listingCreateSchema.safeParse({ ...car, priceTzs }).success).toBe(false);
  });
  it("refuses a listing without mileage, but allows 0 km for brand new", () => {
    expect(listingCreateSchema.safeParse({ ...car, mileageKm: "" }).success).toBe(false);
    expect(listingCreateSchema.safeParse({ ...car, mileageKm: undefined }).success).toBe(false);
    expect(listingCreateSchema.safeParse({ ...car, condition: "NEW", mileageKm: "0" }).success).toBe(true);
  });
  it("requires make, model, year, fuel, transmission and condition", () => {
    for (const k of ["makeId", "modelId", "year", "fuelType", "transmission", "condition"]) {
      const { [k]: _omit, ...rest } = car as Record<string, unknown>;
      void _omit;
      expect(listingCreateSchema.safeParse(rest).success, k).toBe(false);
    }
  });
  it("requires the ownership confirmation", () => expect(listingCreateSchema.safeParse({ ...car, confirmOwnership: false }).success).toBe(false));
  it("allows renewing through an update", () => expect(listingUpdateSchema.safeParse({ renew: true }).success).toBe(true));
});

describe("spare parts", () => {
  it("refuses a part without a price", () => {
    expect(partCreateSchema.safeParse({ title: "Brake pads", category: "BRAKES", regionId: 1, priceTzs: "" }).success).toBe(false);
    expect(partCreateSchema.safeParse({ title: "Brake pads", category: "BRAKES", regionId: 1, priceTzs: "145,000" }).success).toBe(true);
  });
});

describe("seller registration", () => {
  const shop = { name: "Juma Motors", phone: "0711222444", regionId: 1, address: "Mikocheni B" };
  it("accepts a dealer and a car yard", () => {
    expect(registrationDetailsSchema.safeParse({ accountType: "DEALER", shop }).success).toBe(true);
    expect(registrationDetailsSchema.safeParse({ accountType: "YARD", shop }).success).toBe(true);
  });
  it("needs a physical address", () => expect(shopSchema.safeParse({ ...shop, address: "" }).success).toBe(false));
  it("service providers must list services, each with a price", () => {
    expect(registrationDetailsSchema.safeParse({ accountType: "SERVICE_PROVIDER", shop }).success).toBe(false);
    expect(registrationDetailsSchema.safeParse({ accountType: "SERVICE_PROVIDER", shop: { ...shop, services: [{ category: "DIAGNOSTICS", title: "Diagnostics", priceFromTzs: "" }] } }).success).toBe(false);
    expect(registrationDetailsSchema.safeParse({ accountType: "SERVICE_PROVIDER", shop: { ...shop, services: [{ category: "DIAGNOSTICS", title: "Diagnostics", priceFromTzs: "50,000" }] } }).success).toBe(true);
  });
  it("sign-up accepts every seller type the form offers", () => {
    for (const accountType of ["BUYER", "SELLER", "DEALER", "YARD", "IMPORTER", "PARTS_VENDOR", "SERVICE_PROVIDER"]) {
      expect(registerSchema.safeParse({ name: "Test User", phone: "0711000111", password: "secret123", accountType, acceptTerms: true }).success, accountType).toBe(true);
    }
  });
  it("Lipa Namba codes are normalised to upper case", () => {
    const r = manualPaymentSchema.safeParse({ reference: "qjk7h2lm9p", msisdn: "0668212595" });
    expect(r.success && r.data.reference).toBe("QJK7H2LM9P");
  });
});

describe("loan estimate", () => {
  it("matches the standard amortisation formula", () => {
    expect(Math.round(monthlyLoanPayment(1_200_000, 0, 12))).toBe(100_000);
    expect(Math.round(monthlyLoanPayment(10_000_000, 17, 36))).toBeGreaterThan(350_000);
  });
  it("estimates at 30% deposit, 17%, 36 months, rounded to TSh 1,000", () => {
    const m = estimateMonthly(50_000_000);
    expect(m % 1000).toBe(0);
    expect(m).toBe(Math.round(monthlyLoanPayment(35_000_000, 17, 36) / 1000) * 1000);
  });
});

describe("alerts, reviews, password reset helpers", () => {
  it("saved searches keep filters only (no page/sort)", () => {
    expect(normaliseSearchQuery("?page=3&sort=newest&make=toyota&priceMax=50m")).toBe("make=toyota&priceMax=50m");
    expect(normaliseSearchQuery("page=2")).toBe("");
  });
  it("reset codes go by SMS for phones and by email for emails", () => {
    expect(resetDestination("0668 212 595")).toMatchObject({ via: "sms", key: "+255668212595" });
    expect(resetDestination("Juma@Example.com")).toMatchObject({ via: "email", key: "juma@example.com" });
    expect(resetDestination("nonsense")).toBeNull();
  });
  it("reviewers are shown by first name and initial", () => {
    expect(displayName("Juma Hassan Mwakyusa")).toBe("Juma M.");
    expect(displayName("Neema")).toBe("Neema");
  });
  it("emails escape HTML and include the action link", () => {
    const { html, text } = renderEmail({ to: "a@b.c", subject: "Hi <b>", lines: ["x < y"], action: { label: "Open", url: "https://magarisoko.co.tz/x" } });
    expect(html).toContain("Hi &lt;b&gt;");
    expect(html).toContain("https://magarisoko.co.tz/x");
    expect(text).toContain("Open: https://magarisoko.co.tz/x");
  });
});
