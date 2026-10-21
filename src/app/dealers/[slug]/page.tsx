import { permanentRedirect } from "next/navigation";

/** Old showroom URLs now live on the mini-site. */
export default async function DealerRedirect({ params }: { params: Promise<{ slug: string }> }) {
  permanentRedirect(`/shop/${(await params).slug}`);
}
