/**
 * Fraud-prevention tuning. Every number here can be adjusted without touching
 * the engine (src/server/fraud). Scores add up per listing / inquiry:
 *
 *   0–29   LOW     → normal flow (trusted sellers publish instantly)
 *   30–59  MEDIUM  → held for moderator review, shown with reasons
 *   60+    HIGH    → held, listed first in the Fraud queue; never auto-published
 */
export const RISK_THRESHOLDS = { MEDIUM: 30, HIGH: 60 } as const;

export const POINTS = {
  // hard hits
  BLOCKLIST_IDENTITY: 100,        // banned phone / email / device / chassis / photo
  BLOCKLIST_KEYWORD: 60,          // admin-added banned phrase
  SELLER_SHADOW_BANNED: 100,
  // price
  PRICE_FAR_BELOW_MARKET: 45,     // < 50% of the market median
  PRICE_BELOW_MARKET: 25,         // < 65% of the market median
  // photos
  PHOTO_USED_BY_OTHER_SELLER: 35, // per matching photo, capped below
  PHOTO_CAP: 55,
  // wording
  SCAM_WORDING_CAP: 50,
  CONTACT_IN_TEXT: 15,            // phone / email / link / bank account in the description
  // identity links
  PHONE_SHARED_1: 30,             // contact number used by 1–2 other accounts
  PHONE_SHARED_3: 45,             // … by 3 or more other accounts
  DEVICE_OF_BANNED_USER: 60,
  DEVICE_MANY_ACCOUNTS: 25,       // device used by 3+ other accounts
  // vehicle identity
  CHASSIS_DUPLICATE: 40,
  CHASSIS_FORMAT: 10,
  // account
  NEW_ACCOUNT_HIGH_VALUE: 15,     // < 72 h old, price ≥ 50M
  BRAND_NEW_ACCOUNT_VERY_HIGH: 19,// < 24 h old, price ≥ 100M (account signals alone stay below MEDIUM)
  NO_WALLET_HIGH_VALUE: 10,       // private seller, no mobile-money-verified wallet, price ≥ 30M
  // community
  SCAM_REPORT_1: 15,
  SCAM_REPORTS_2: 40,             // 2+ distinct reporters
  SELLER_MANY_REPORTS: 30,        // 3+ open scam reports across the seller's listings
  // edits after approval
  SUSPICIOUS_EDIT: 20,
  // trust credits (negative)
  VERIFIED_BUSINESS: -20,
  WALLET_VERIFIED: -10,
  ESTABLISHED_SELLER: -10,
} as const;

/** Price comparison needs at least this many comparable live/sold listings. */
export const PRICE_MIN_SAMPLES = 4;
/** Two photos are "the same" when their 64-bit dHash differs in ≤ this many bits. */
export const PHOTO_MAX_HAMMING = 6;
/** A price cut this large (%) after approval always sends a live listing back to review. */
export const PRICE_CUT_HOLD_PCT = 50;
/** Distinct reporters needed before a listing is automatically hidden for review. */
export const AUTO_HOLD_REPORTERS = 2;

/** Seller is "established" (can publish LOW-risk listings without review). */
export const TRUSTED_SELLER = { minAccountDays: 30, minApprovedListings: 1 } as const;

/**
 * Scam phrases (English + Kiswahili). Matching is case-insensitive on whole
 * words/phrases. Weights add up, capped at POINTS.SCAM_WORDING_CAP.
 * Importers legitimately mention the port, so "port" phrases weigh less there.
 */
export const SCAM_PHRASES: Array<{ re: RegExp; weight: number; label: string; importWeight?: number }> = [
  { re: /\b(pay|send|transfer)\s+(the\s+)?(money|payment|deposit|cash)\s+(first|before|upfront)\b/i, weight: 30, label: "asks for payment first" },
  { re: /\bpay\s+first\b|\bupfront\s+payment\b|\badvance\s+payment\b/i, weight: 30, label: "asks for payment first" },
  { re: /\b(booking|reservation|holding|viewing|inspection)\s+fee\b/i, weight: 30, label: "booking/holding fee" },
  { re: /\b(refundable\s+)?deposit\b/i, weight: 20, label: "deposit" },
  { re: /\bwestern\s*union\b|\bmoney\s*gram\b|\bworld\s*remit\b|\bbitcoin\b|\busdt\b|\bcrypto\b|\bgift\s*cards?\b/i, weight: 35, label: "untraceable payment method" },
  { re: /\b(i\s+am|i'm|currently|presently)\s+(abroad|out\s+of\s+(the\s+)?country|overseas|outside\s+tanzania)\b/i, weight: 30, label: "seller claims to be abroad" },
  { re: /\b(military|deployed|on\s+a\s+mission|offshore\s+rig)\b/i, weight: 25, label: "absent-seller story" },
  { re: /\b(shipping|delivery|transport|clearing)\s+(agent|company)\s+will\b/i, weight: 25, label: "third-party agent will deliver" },
  { re: /\b(at|in)\s+the\s+port\b|\bclearing\s+fee\b|\bcustoms\s+fee\b/i, weight: 15, importWeight: 0, label: "car 'at the port' / clearing fee" },
  { re: /\b(urgent(ly)?|quick)\s+sale\b.*\b(relocat|leaving|travel)/i, weight: 15, label: "urgent sale story" },
  { re: /\bno\s+(viewing|inspection|test\s*drive)s?\b/i, weight: 25, label: "refuses viewing/inspection" },
  { re: /\b(overpay|refund\s+the\s+(difference|balance|excess))\b/i, weight: 35, label: "overpayment story" },
  // Kiswahili
  { re: /\blipa\s+kwanza\b|\btuma\s+(pesa|hela)\s+kwanza\b|\bmalipo\s+ya\s+awali\b/i, weight: 30, label: "malipo kwanza (pay first)" },
  { re: /\bada\s+ya\s+(kushikilia|kuhifadhi|ukaguzi|kuona)\b/i, weight: 30, label: "ada ya kushikilia (holding fee)" },
  { re: /\bamana\b|\bkianzio\b/i, weight: 20, label: "amana (deposit)" },
  { re: /\bniko\s+nje\s+ya\s+nchi\b|\bnipo\s+nje\s+ya\s+nchi\b|\bniko\s+(ulaya|marekani|dubai)\b/i, weight: 30, label: "niko nje ya nchi (abroad)" },
  { re: /\b(liko|lipo|iko)\s+bandarini\b|\bada\s+ya\s+(kutoa|forodha|bandari)\b/i, weight: 15, importWeight: 0, label: "liko bandarini / ada ya forodha" },
  { re: /\bwakala\s+(atakuletea|atalileta|wa\s+usafiri)\b/i, weight: 25, label: "wakala atalileta (agent delivers)" },
  { re: /\bhakuna\s+(kuona|ukaguzi|kujaribu)\b/i, weight: 25, label: "hakuna ukaguzi (no inspection)" },
  { re: /\bnitatuma\s+ziada\b|\brudisha\s+(ziada|chenji)\b/i, weight: 35, label: "rudisha ziada (overpayment)" },
];

/** Things that push buyers off-platform when written inside a description. */
export const CONTACT_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /(\+?255|\b0)[\s-]?[67]\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/, label: "phone number in description" },
  { re: /\+?\d[\d\s-]{9,}\d/, label: "phone/account number in description" },
  { re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, label: "email in description" },
  { re: /\bhttps?:\/\/|www\.|\.com\b|\.co\.tz\b|wa\.me\//i, label: "link in description" },
  // ("a/c" is deliberately absent — it means air conditioning in car adverts)
  { re: /\b(account\s*(no|number)|akaunti\s+namba|namba\s+ya\s+akaunti|lipa\s+namba|till\s+(no|number))\b/i, label: "bank/till number in description" },
];

/** Inquiry (buyer → seller) scam patterns — mostly overpayment & fake-agent scams. */
export const INQUIRY_SCAM_PHRASES: Array<{ re: RegExp; weight: number; label: string }> = [
  { re: /\b(overpay|refund\s+the\s+(difference|balance|excess)|send\s+back\s+the\s+(extra|balance))\b/i, weight: 50, label: "overpayment scam" },
  { re: /\b(my|our)\s+(agent|shipper|courier|driver)\s+will\s+(collect|pick)/i, weight: 35, label: "unseen buyer's agent" },
  { re: /\bpaypal\b|\bcashier'?s?\s+cheque\b|\bcertified\s+check\b|\bwestern\s*union\b|\bbitcoin\b|\busdt\b/i, weight: 35, label: "unusual payment method" },
  { re: /\bverification\s+(code|otp)\b|\bsend\s+me\s+the\s+code\b|\bnitumie\s+(namba|code)\b/i, weight: 60, label: "asks for verification code" },
  { re: /\bnitatuma\s+ziada\b|\brudisha\s+(ziada|chenji)\b/i, weight: 50, label: "rudisha ziada (overpayment)" },
  { re: /\bwithout\s+(seeing|viewing|inspection)\b|\bbila\s+kuona\b/i, weight: 15, label: "buys without seeing" },
];

/**
 * Chassis/VIN shapes we accept: 17-character VIN (no I, O, Q), or a Japanese
 * frame number such as "GRJ150-1234567" / "NZE141-6012345".
 */
export const CHASSIS_PATTERNS = [/^[A-HJ-NPR-Z0-9]{17}$/i, /^[A-Z0-9]{2,8}-\d{5,8}$/i];
