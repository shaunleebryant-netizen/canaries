export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-slate-500">
        <p className="font-medium text-slate-700">Education only — not investment advice.</p>
        <p className="mt-2 max-w-3xl leading-relaxed">
          Coherant Canary publishes educational market-health readings. Nothing on this site is a
          recommendation to buy or sell any security. Past readings do not promise future
          performance. You are responsible for your own decisions.
        </p>
        <p className="mt-4 text-xs text-slate-400">© {new Date().getFullYear()} Coherant Canary</p>
      </div>
    </footer>
  );
}
