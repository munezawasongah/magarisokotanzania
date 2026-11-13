/**
 * Tanzania mobile numbers. Stored in E.164 (+255…). The national significant number
 * is 9 digits starting 6 or 7. Network prefixes pre-select the mobile-money wallet.
 */
export const PHONE = {
  dialCode: "255",
  nationalPattern: /^[67]\d{8}$/,
  /** "+255 712 345 678" */
  group: [3, 3, 3] as const,
  networks: {
    VODACOM: ["74", "75", "76"],
    AIRTEL: ["68", "69", "78"],
    YAS: ["65", "67", "71", "77"],
    HALOTEL: ["61", "62"],
    TTCL: ["73"],
  } as Record<string, string[]>,
};
