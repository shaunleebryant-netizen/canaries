import ideasJson from "../../data/ideas.json";

export type IdeaSide = "buy" | "sell" | "trim" | "watch";

export interface DeskIdea {
  id: string;
  handle: string;
  ticker: string;
  side: IdeaSide;
  summary: string;
  level?: string;
  postedAt: string;
  url: string;
  pinned?: boolean;
}

export interface IdeasState {
  asOf: string;
  allowlist: string[];
  ideas: DeskIdea[];
}

/**
 * Load desk ideas pack.
 * Bundled JSON import — works on Cloudflare Workers (no runtime fs).
 * Same pattern as loadState.
 */
export function loadIdeas(): IdeasState {
  return ideasJson as IdeasState;
}
