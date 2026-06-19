import Link from "next/link";

type ContinueLink = Readonly<{
  href: `/${string}`;
  label: string;
}>;

export function DiagnosisContinueSection({ links }: { readonly links: readonly ContinueLink[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-zinc-900">Continue your diagnosis</h2>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex items-center rounded-lg border border-zinc-200/90 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-black/[0.02] transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            {link.label}
            <span className="ml-1.5 text-zinc-500" aria-hidden>
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
