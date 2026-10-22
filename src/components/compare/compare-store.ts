"use client";
import { useEffect, useState } from "react";

/** Up to 3 car ids kept in this browser (per-visitor convenience; nothing stored on the server). */
const KEY = "ms_compare";
const EVENT = "ms-compare-change";
export const COMPARE_MAX = 3;

export function readCompare(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}

export function writeCompare(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, COMPARE_MAX)));
  } catch {
    /* private mode — compare still works for this page view */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: ids.slice(0, COMPARE_MAX) }));
}

export function useCompare() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(readCompare());
    const onChange = (e: Event) => setIds((e as CustomEvent<string[]>).detail ?? readCompare());
    const onStorage = (e: StorageEvent) => e.key === KEY && setIds(readCompare());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const toggle = (id: string) => {
    const cur = readCompare();
    if (cur.includes(id)) return writeCompare(cur.filter((x) => x !== id)), true;
    if (cur.length >= COMPARE_MAX) return false;
    writeCompare([...cur, id]);
    return true;
  };
  return { ids, toggle, clear: () => writeCompare([]), set: (next: string[]) => writeCompare(next) };
}
