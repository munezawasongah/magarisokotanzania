import { fmt, type Dictionary } from "@/i18n";
import { formatTzs } from "./money";

/** "Private sellers sign up free … Businesses pay a one-off sign-up fee of TSh 30,000." */
export function registrationSubtitle(dict: Dictionary, businessFee: number) {
  return fmt(dict.reg.subtitleFree, {
    businessFee: businessFee > 0 ? fmt(dict.reg.businessFeePaid, { fee: formatTzs(businessFee) }) : dict.reg.businessFeeFree,
  }).trim();
}
