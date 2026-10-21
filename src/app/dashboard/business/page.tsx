import { redirect } from "next/navigation";

/** Old business-settings URL — the mini-site editor replaced it. */
export default function BusinessPage() {
  redirect("/dashboard/shop");
}
