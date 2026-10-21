import Link from "next/link";
import { Fragment } from "react";

/**
 * Renders a dictionary sentence such as "I agree to the {terms} and {privacy}"
 * with each placeholder turned into a link to the matching legal page.
 */
export function LegalText({ template, labels, className }: { template: string; labels: Partial<Record<"terms" | "privacy" | "safety", string>>; className?: string }) {
  const parts = template.split(/(\{terms\}|\{privacy\}|\{safety\})/g);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        const key = p.replace(/[{}]/g, "") as "terms" | "privacy" | "safety";
        if (p.startsWith("{") && labels[key]) {
          return (
            <Link key={i} href={`/${key}`} target="_blank" className="font-medium underline underline-offset-2 hover:text-ink-950">
              {labels[key]}
            </Link>
          );
        }
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </span>
  );
}
