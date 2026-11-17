import Link from "next/link";

interface NoticeProps {
  title: string;
  body: string;
  backHref: string;
  backLabel: string;
}

export function Notice({ title, body, backHref, backLabel }: NoticeProps) {
  return (
    <section className="flex animate-rise flex-col gap-4 border-t border-line-strong pt-8">
      <h1 className="display text-[clamp(1.75rem,7vw,2.5rem)]">{title}</h1>
      <p className="max-w-prose text-muted">{body}</p>
      <Link href={backHref} className="btn btn-primary mt-2 justify-between sm:w-fit sm:min-w-64">
        {backLabel}
        <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
