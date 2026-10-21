import { getDictionary } from "@/i18n/server";
import { enumLabel } from "@/i18n";
import { getBodyTypePhotoCredits } from "@/lib/settings";

export const metadata = { title: "Photo credits" };
export const dynamic = "force-dynamic";

/** Attribution for the freely-licensed (Creative Commons / public domain) photos used on the site. */
export default async function PhotoCreditsPage() {
  const { dict, locale } = await getDictionary();
  const credits = await getBodyTypePhotoCredits();
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="display text-3xl">{locale === "sw" ? "Wamiliki wa picha" : "Photo credits"}</h1>
      <p className="mt-2 text-sm text-ink-500">
        {locale === "sw"
          ? "Picha za aina za magari kwenye ukurasa wa mbele zinatoka Wikimedia Commons chini ya leseni huru. Tunawashukuru wapiga picha wafuatao."
          : "The body-type photos on the home page come from Wikimedia Commons under free licences. With thanks to the photographers below. Photos were cropped to fit."}
      </p>
      {credits.length === 0 ? (
        <p className="panel mt-6 p-6 text-sm text-ink-500">{locale === "sw" ? "Hakuna picha za nje zinazotumika kwa sasa." : "No third-party photos are in use at the moment."}</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-white">
          {credits.map((c) => (
            <li key={c.body} className="space-y-1 p-4 text-sm">
              <p className="font-semibold">{enumLabel(dict, "BodyType", c.body)}</p>
              <p className="text-ink-700">
                “<a href={c.source} target="_blank" rel="noopener noreferrer" className="underline">{c.title}</a>” by {c.artist}
                {" — "}
                {c.licenseUrl ? <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline">{c.license}</a> : c.license}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
