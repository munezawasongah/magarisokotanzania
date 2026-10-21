import Link from "next/link";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";
import { LEGAL, type LegalKey } from "@/content/legal";
import { SITE } from "@/config/site";

/** Shared layout for Terms of Use, Privacy Policy and Safety Policy (EN + SW). */
export async function LegalPage({ doc: key }: { doc: LegalKey }) {
  const { dict, locale } = await getDictionary();
  const doc = LEGAL[locale][key];
  const updated = new Date(SITE.legalUpdated).toLocaleDateString(locale === "sw" ? "sw-TZ" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const others = (["terms", "privacy", "safety"] as const).filter((k) => k !== key);

  return (
    <div className="container py-10">
      <div className="max-w-3xl">
        <p className="text-sm text-ink-500">{SITE.fullName}</p>
        <h1 className="display mt-1 text-3xl md:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-ink-500">{fmt(dict.legal.lastUpdated, { date: updated })}</p>
        <p className="mt-5 text-[17px] leading-7 text-ink-700">{doc.summary}</p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <nav aria-label={dict.legal.onThisPage} className="rounded-lg border border-line bg-white p-4">
            <p className="mb-2 text-sm font-semibold">{dict.legal.onThisPage}</p>
            <ol className="space-y-1.5 text-sm">
              {doc.sections.map((s) => (
                <li key={s.id}><a href={`#${s.id}`} className="text-ink-700 hover:text-ink-950 hover:underline">{s.heading.replace(/^\d+\.\s*/, "")}</a></li>
              ))}
            </ol>
          </nav>
          <div className="mt-4 rounded-lg border border-line bg-white p-4 text-sm">
            <p className="mb-2 font-semibold">{dict.legal.otherDocs}</p>
            <ul className="space-y-1.5">
              {others.map((k) => <li key={k}><Link href={`/${k}`} className="text-ink-700 underline-offset-2 hover:underline">{dict.legal[k]}</Link></li>)}
            </ul>
          </div>
        </aside>

        <article className="max-w-[68ch] space-y-10">
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-xl font-bold">{s.heading}</h2>
              <div className="mt-3 space-y-3 text-[15px] leading-7 text-ink-700">
                {s.body.map((b, i) =>
                  typeof b === "string" ? (
                    <p key={i}>{b}</p>
                  ) : (
                    <ul key={i} className="list-disc space-y-2 pl-5 marker:text-ink-300">
                      {b.list.map((li) => <li key={li}>{li}</li>)}
                    </ul>
                  ),
                )}
              </div>
            </section>
          ))}
          <p className="border-t border-line pt-6 text-sm text-ink-500">
            © {SITE.copyrightYear} {SITE.company}. {dict.legal.rights} {fmt(dict.legal.productOf, { brand: SITE.fullName, company: SITE.company })}
          </p>
        </article>
      </div>
    </div>
  );
}
