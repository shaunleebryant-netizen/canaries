/** Visual stand-in only. These marks are not tickers and are not read from the universe files. */
export const FREE_UNIVERSE_MARK = "••••";

export function freeUniversePlaceholder(): { id: string; label: string; items: { ticker: string }[] }[] {
  const items = () => Array.from({ length: 8 }, () => ({ ticker: FREE_UNIVERSE_MARK }));
  return [
    { id: "stocks", label: "Stocks", items: items() },
    { id: "sector-etfs", label: "Sector ETFs", items: items() },
    { id: "countries", label: "Countries", items: items() },
    { id: "crypto", label: "Crypto", items: items() },
  ];
}
