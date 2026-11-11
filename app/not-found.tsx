import { messages } from "@/lib/i18n";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-semibold">{messages.notFound.title}</h1>
      <p className="opacity-70">{messages.notFound.body}</p>
    </main>
  );
}
