import Link from "next/link";

interface NoticeProps {
  title: string;
  body: string;
  backHref: string;
  backLabel: string;
}

export function Notice({ title, body, backHref, backLabel }: NoticeProps) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-brand-surface p-5">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="opacity-80">{body}</p>
      <Link
        href={backHref}
        className="flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-4 font-semibold text-brand-on-primary"
      >
        {backLabel}
      </Link>
    </section>
  );
}
