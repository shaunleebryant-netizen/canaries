import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Weekly letter",
  robots: { index: false, follow: false },
};

type SP = Promise<Record<string, string | string[] | undefined>>;

const box = "mx-auto max-w-lg px-4 py-20 text-center";
const btn =
  "rounded-xl bg-canary-gold px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-yellow-400";

/** Confirm / unsubscribe landing page for links in letter emails. */
export default async function LetterPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "";
  const action = one("action");
  const result = one("result");
  const token = one("token").slice(0, 200);

  if (action === "verify" && token) {
    return (
      <div className={box}>
        <h1 className="text-2xl font-semibold text-white">Confirm your signup</h1>
        <p className="mt-3 text-sm text-slate-400">
          Press the button to confirm you&apos;d like the free weekly Canary letter.
        </p>
        <form action="/api/verify" method="post" className="mt-8">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={btn}>Yes, confirm</button>
        </form>
      </div>
    );
  }
  if (action === "unsubscribe" && token) {
    return (
      <div className={box}>
        <h1 className="text-2xl font-semibold text-white">Unsubscribe</h1>
        <p className="mt-3 text-sm text-slate-400">
          Press the button and we&apos;ll stop emailing you the letter.
        </p>
        <form action="/api/unsubscribe" method="post" className="mt-8">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={btn}>Unsubscribe me</button>
        </form>
      </div>
    );
  }

  const copy: Record<string, [string, string]> = {
    verified: ["You're confirmed", "Thanks. The weekly letter will come to your inbox. Every email has a one-click unsubscribe link."],
    unsubscribed: ["You're unsubscribed", "You won't get the letter any more. If you change your mind, sign up again on the homepage."],
    invalid: ["That link didn't work", "It may have expired or already been used. You can sign up again on the homepage."],
  };
  const [title, body] = copy[result] ?? copy.invalid;
  return (
    <div className={box}>
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      <p className="mt-3 text-sm text-slate-400">{body}</p>
      <Link href="/" className="mt-8 inline-block text-sm text-canary-gold hover:underline">
        Back to Canary Dashboard
      </Link>
    </div>
  );
}
