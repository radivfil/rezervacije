import { messages } from "@/lib/i18n";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-3 p-6">
      <h1 className="display text-[clamp(2rem,9vw,3.25rem)]">{messages.home.title}</h1>
      <p className="text-muted">{messages.home.body}</p>
    </main>
  );
}
