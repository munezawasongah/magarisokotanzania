import type { BodyType, FuelType } from "@/generated/prisma/enums";
import type { RunningCosts } from "@/lib/settings";

/**
 * Rough fuel economy (km per litre, mixed driving) from engine size, fuel and body.
 * Shown only as a labelled estimate; real figures depend on the car, driver and roads.
 */
export function estimateKmPerLitre(engineCc: number | null, fuel: FuelType, body: BodyType): number | null {
  if (fuel === "ELECTRIC") return null;
  if (body === "MOTORCYCLE") return 40;
  if (body === "THREE_WHEELER") return 28;
  if (body === "TRUCK" || body === "BUS") return null; // depends too much on load to estimate
  const byCc = (cc: number) => (cc <= 1000 ? 18 : cc <= 1300 ? 16 : cc <= 1500 ? 14.5 : cc <= 1800 ? 12.5 : cc <= 2000 ? 11.5 : cc <= 2500 ? 10 : cc <= 3000 ? 8.5 : cc <= 4000 ? 7 : 6);
  const byBody: Partial<Record<BodyType, number>> = { HATCHBACK: 15, SEDAN: 13.5, WAGON: 13, COUPE: 11, CONVERTIBLE: 11, SUV: 9.5, PICKUP: 9.5, MINIVAN: 10.5, VAN: 9, MINIBUS: 8 };
  let kmpl = engineCc ? byCc(engineCc) : byBody[body] ?? 12;
  if (engineCc && (body === "SUV" || body === "PICKUP")) kmpl *= 0.88;
  if (engineCc && (body === "VAN" || body === "MINIBUS")) kmpl *= 0.85;
  if (fuel === "DIESEL") kmpl *= 1.2;
  if (fuel === "HYBRID") kmpl *= 1.6;
  if (fuel === "PLUG_IN_HYBRID") kmpl *= 2;
  return Math.round(kmpl * 10) / 10;
}

export function runningCostEstimate(car: { priceTzs: number; engineCc: number | null; fuelType: FuelType; bodyType: BodyType }, rc: RunningCosts) {
  const kmpl = estimateKmPerLitre(car.engineCc, car.fuelType, car.bodyType);
  const litrePrice = car.fuelType === "DIESEL" ? rc.dieselPerLitre : rc.petrolPerLitre;
  const fuelPerMonth = kmpl ? Math.round(((rc.kmPerMonth / kmpl) * litrePrice) / 100) * 100 : null;
  const insurancePerYear = Math.round((car.priceTzs * rc.insurancePct) / 100 / 100) * 100;
  return { kmpl, litrePrice, fuelPerMonth, insurancePerYear, kmPerMonth: rc.kmPerMonth };
}
