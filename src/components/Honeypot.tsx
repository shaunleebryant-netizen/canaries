/**
 * Spam trap for public forms: a field people never see or fill. Bots that fill every input
 * trip it; the API then pretends success and stores nothing (src/lib/leads.ts isBot).
 */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
      <label htmlFor="hp_field">Leave this empty</label>
      <input id="hp_field" name="hp_field" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}
