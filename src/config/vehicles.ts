import type { BodyType } from "@/generated/prisma/enums";

/**
 * Makes and models that dominate the Tanzanian market (mostly Japanese
 * imports, plus UK/SA-sourced European vehicles, trucks and two/three-wheelers).
 * Admins can add more from the database; this is the seed baseline.
 */
export type MakeSeed = {
  name: string;
  country: string;
  popular?: boolean;
  models: Array<[name: string, body?: BodyType]>;
};

export const VEHICLE_MAKES: MakeSeed[] = [
  {
    name: "Toyota", country: "Japan", popular: true,
    models: [
      ["IST", "HATCHBACK"], ["Vitz", "HATCHBACK"], ["Passo", "HATCHBACK"], ["Belta", "SEDAN"], ["Spacio", "WAGON"],
      ["Raum", "MINIVAN"], ["Sienta", "MINIVAN"], ["Wish", "MINIVAN"], ["Noah", "MINIVAN"], ["Voxy", "MINIVAN"],
      ["Alphard", "MINIVAN"], ["Vellfire", "MINIVAN"], ["Corolla", "SEDAN"], ["Corolla Axio", "SEDAN"],
      ["Corolla Fielder", "WAGON"], ["Premio", "SEDAN"], ["Allion", "SEDAN"], ["Mark X", "SEDAN"], ["Crown", "SEDAN"],
      ["Camry", "SEDAN"], ["Prius", "HATCHBACK"], ["Aqua", "HATCHBACK"], ["Auris", "HATCHBACK"], ["Probox", "WAGON"],
      ["Succeed", "WAGON"], ["Harrier", "SUV"], ["RAV4", "SUV"], ["Vanguard", "SUV"], ["Kluger", "SUV"], ["Rush", "SUV"],
      ["Fortuner", "SUV"], ["Land Cruiser Prado", "SUV"], ["Land Cruiser 70 Series", "SUV"], ["Land Cruiser 200", "SUV"],
      ["Land Cruiser 300", "SUV"], ["Hilux", "PICKUP"], ["Hiace", "VAN"], ["Townace", "VAN"], ["Coaster", "MINIBUS"],
      ["Dyna", "TRUCK"], ["C-HR", "SUV"], ["Yaris", "HATCHBACK"],
    ],
  },
  {
    name: "Nissan", country: "Japan", popular: true,
    models: [
      ["March", "HATCHBACK"], ["Note", "HATCHBACK"], ["Tiida", "HATCHBACK"], ["Sylphy", "SEDAN"], ["Wingroad", "WAGON"],
      ["AD Van", "WAGON"], ["Juke", "SUV"], ["Dualis", "SUV"], ["X-Trail", "SUV"], ["Murano", "SUV"], ["Patrol", "SUV"],
      ["Navara", "PICKUP"], ["Hardbody", "PICKUP"], ["Serena", "MINIVAN"], ["Caravan", "VAN"], ["Civilian", "MINIBUS"], ["UD Trucks", "TRUCK"],
    ],
  },
  {
    name: "Subaru", country: "Japan", popular: true,
    models: [["Impreza", "HATCHBACK"], ["Legacy", "WAGON"], ["Outback", "WAGON"], ["Forester", "SUV"], ["XV", "SUV"], ["Exiga", "MINIVAN"]],
  },
  {
    name: "Mitsubishi", country: "Japan", popular: true,
    models: [
      ["Colt", "HATCHBACK"], ["Lancer", "SEDAN"], ["RVR", "SUV"], ["Outlander", "SUV"], ["Pajero", "SUV"], ["Pajero iO", "SUV"],
      ["Pajero Sport", "SUV"], ["L200 / Triton", "PICKUP"], ["Delica", "MINIVAN"], ["Canter", "TRUCK"], ["Fuso Fighter", "TRUCK"], ["Rosa", "MINIBUS"],
    ],
  },
  {
    name: "Honda", country: "Japan", popular: true,
    models: [["Fit", "HATCHBACK"], ["Insight", "HATCHBACK"], ["Civic", "SEDAN"], ["Accord", "SEDAN"], ["Stream", "MINIVAN"], ["Freed", "MINIVAN"], ["Vezel", "SUV"], ["CR-V", "SUV"]],
  },
  {
    name: "Mazda", country: "Japan", popular: true,
    models: [["Demio", "HATCHBACK"], ["Verisa", "HATCHBACK"], ["Axela", "HATCHBACK"], ["Atenza", "SEDAN"], ["Premacy", "MINIVAN"], ["CX-3", "SUV"], ["CX-5", "SUV"], ["BT-50", "PICKUP"], ["Bongo", "VAN"]],
  },
  {
    name: "Suzuki", country: "Japan", popular: true,
    models: [["Alto", "HATCHBACK"], ["Swift", "HATCHBACK"], ["Escudo", "SUV"], ["Vitara", "SUV"], ["Jimny", "SUV"], ["Every", "VAN"], ["Carry", "PICKUP"]],
  },
  {
    name: "Isuzu", country: "Japan", popular: true,
    models: [["D-Max", "PICKUP"], ["MU-X", "SUV"], ["Elf / NPR", "TRUCK"], ["NQR", "TRUCK"], ["FVR", "TRUCK"], ["Giga", "TRUCK"], ["Journey", "MINIBUS"]],
  },
  { name: "Lexus", country: "Japan", models: [["IS", "SEDAN"], ["ES", "SEDAN"], ["NX", "SUV"], ["RX", "SUV"], ["GX", "SUV"], ["LX", "SUV"]] },
  { name: "Daihatsu", country: "Japan", models: [["Mira", "HATCHBACK"], ["Terios", "SUV"], ["Hijet", "VAN"], ["Delta", "TRUCK"]] },
  { name: "Hino", country: "Japan", models: [["Dutro", "TRUCK"], ["Ranger", "TRUCK"], ["500 Series", "TRUCK"], ["700 Series", "TRUCK"], ["Liesse", "MINIBUS"]] },
  {
    name: "Mercedes-Benz", country: "Germany",
    models: [["A-Class", "HATCHBACK"], ["C-Class", "SEDAN"], ["E-Class", "SEDAN"], ["S-Class", "SEDAN"], ["GLC", "SUV"], ["ML / GLE", "SUV"], ["G-Class", "SUV"], ["Sprinter", "VAN"], ["Actros", "TRUCK"], ["Axor", "TRUCK"]],
  },
  { name: "BMW", country: "Germany", models: [["1 Series", "HATCHBACK"], ["3 Series", "SEDAN"], ["5 Series", "SEDAN"], ["X1", "SUV"], ["X3", "SUV"], ["X5", "SUV"]] },
  { name: "Volkswagen", country: "Germany", models: [["Polo", "HATCHBACK"], ["Golf", "HATCHBACK"], ["Passat", "SEDAN"], ["Tiguan", "SUV"], ["Touareg", "SUV"], ["Amarok", "PICKUP"], ["Transporter", "VAN"]] },
  { name: "Audi", country: "Germany", models: [["A3", "HATCHBACK"], ["A4", "SEDAN"], ["A6", "SEDAN"], ["Q5", "SUV"], ["Q7", "SUV"]] },
  {
    name: "Land Rover", country: "United Kingdom",
    models: [["Defender", "SUV"], ["Discovery", "SUV"], ["Discovery Sport", "SUV"], ["Range Rover", "SUV"], ["Range Rover Sport", "SUV"], ["Range Rover Evoque", "SUV"], ["Freelander", "SUV"]],
  },
  { name: "Ford", country: "USA", models: [["Fiesta", "HATCHBACK"], ["Focus", "HATCHBACK"], ["EcoSport", "SUV"], ["Escape", "SUV"], ["Everest", "SUV"], ["Ranger", "PICKUP"]] },
  { name: "Hyundai", country: "South Korea", models: [["i10", "HATCHBACK"], ["Creta", "SUV"], ["Tucson", "SUV"], ["Santa Fe", "SUV"], ["H-1", "VAN"], ["County", "MINIBUS"]] },
  { name: "Kia", country: "South Korea", models: [["Picanto", "HATCHBACK"], ["Rio", "HATCHBACK"], ["Sportage", "SUV"], ["Sorento", "SUV"]] },
  { name: "Volvo", country: "Sweden", models: [["XC60", "SUV"], ["XC90", "SUV"], ["FH", "TRUCK"], ["FMX", "TRUCK"]] },
  { name: "Scania", country: "Sweden", models: [["P-Series", "TRUCK"], ["G-Series", "TRUCK"], ["R-Series", "TRUCK"], ["Touring", "BUS"]] },
  { name: "MAN", country: "Germany", models: [["TGS", "TRUCK"], ["TGX", "TRUCK"]] },
  { name: "Yutong", country: "China", models: [["ZK6122", "BUS"], ["ZK6938", "BUS"]] },
  { name: "Sinotruk", country: "China", models: [["Howo", "TRUCK"]] },
  { name: "Bajaj", country: "India", popular: true, models: [["Boxer", "MOTORCYCLE"], ["Pulsar", "MOTORCYCLE"], ["RE (Bajaji)", "THREE_WHEELER"]] },
  { name: "TVS", country: "India", models: [["HLX", "MOTORCYCLE"], ["Star", "MOTORCYCLE"], ["King (Bajaji)", "THREE_WHEELER"]] },
  { name: "Haojue", country: "China", models: [["HJ125", "MOTORCYCLE"]] },
];

export const VEHICLE_FEATURES = [
  "Air conditioning", "Climate control", "Power steering", "Power windows", "Central locking", "Keyless entry",
  "Push start", "Reverse camera", "360° camera", "Parking sensors", "Navigation", "Bluetooth", "Apple CarPlay / Android Auto",
  "Cruise control", "Leather seats", "Heated seats", "Sunroof", "Alloy wheels", "Fog lights", "LED headlights",
  "Roof rails", "Tow bar", "Snorkel", "Diff lock", "Bull bar", "Airbags", "ABS", "Traction control",
  "Third-row seats", "Dual-zone A/C", "Spare key", "Service history", "Tracking device",
] as const;
