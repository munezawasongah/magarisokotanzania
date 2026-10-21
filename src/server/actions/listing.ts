"use server";
import { revalidatePath } from "next/cache";
import { listingCreateSchema, listingUpdateSchema } from "@/lib/validation";
import { createListing, ListingError, updateListing, type CreateListingResult } from "@/server/listings";
import { getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export type CreateListingState =
  | { ok: true; result: CreateListingResult }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> };

/** Server action used by the /sell form (JSON payload so arrays/images stay typed). */
export async function createListingAction(payload: unknown): Promise<CreateListingState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please log in to list a vehicle." };
  if (!rateLimit(`list:${user.id}`, 20, 60 * 60_000)) return { ok: false, message: "Too many listings created. Try again later." };
  const parsed = listingCreateSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const result = await createListing(user, parsed.data);
    revalidatePath("/dashboard/listings");
    if (result.status === "ACTIVE") revalidatePath("/cars");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, message: e instanceof ListingError ? e.message : "Could not save the listing. Please try again." };
  }
}

export async function updateListingAction(id: string, patch: unknown) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, message: "Unauthorized" };
  const parsed = listingUpdateSchema.safeParse(patch);
  if (!parsed.success) return { ok: false as const, message: "Invalid update" };
  try {
    const r = await updateListing(user, id, parsed.data);
    revalidatePath("/dashboard/listings");
    revalidatePath(`/cars/${r.slug}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, message: e instanceof ListingError ? e.message : "Update failed" };
  }
}
