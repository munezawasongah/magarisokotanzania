import { NextResponse } from "next/server";

/** Recursively converts BigInt → number and Date → ISO string so data can cross the wire. */
export type Serialized<T> = T extends bigint
  ? number
  : T extends Date
    ? string
    : T extends Array<infer U>
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;

export function serialize<T>(data: T): Serialized<T> {
  return JSON.parse(JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v)));
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(serialize(data), init);
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/**
 * Zod issues → { field: [messages] } keyed by the first real field name, so
 * nested errors (shop.services.0.priceFromTzs) show next to the right input.
 * A leading container key (e.g. "shop") is skipped.
 */
export function fieldErrorsFrom(error: { issues: Array<{ path: Array<string | number>; message: string }> }, container?: string) {
  const out: Record<string, string[]> = {};
  for (const i of error.issues) {
    const path = i.path.filter((p) => typeof p === "string") as string[];
    const key = (container && path[0] === container ? path[1] : path[0]) ?? "_";
    (out[key] ??= []).push(i.message);
  }
  return out;
}
