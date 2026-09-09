export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-400">
        <p className="font-medium text-slate-200">Education only — not investment advice.</p>
        <p className="mt-2 max-w-3xl leading-relaxed">
          Coherant Canary publishes educational market-health readings. Nothing on this site is a
          recommendation to buy or sell any security. Past readings do not promise future
          performance. You are responsible for your own decisions.
        </p>
        <p className="mt-4 text-xs text-slate-500">© {new Date().getFullYear()} Coherant Canary</p>
      </div>
    </footer>
  );
}
