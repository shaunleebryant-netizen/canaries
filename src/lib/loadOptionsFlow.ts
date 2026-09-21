import optionsJson from "../../data/options-flow.json";

export type OptionRight = "call" | "put";

export interface OptionsFlowItem {
  id: string;
  handle: string;
  url: string;
  postedAt: string;
  ticker: string;
  right: OptionRight;
  /** e.g. "185C · 17 Oct · ~45 DTE · ITM" */
  contract: string;
  summary: string;
  tags?: string[];
  priority?: boolean;
  pinned?: boolean;
  qualifiedAt?: string;
  qualifiedBy?: string;
}

export interface OptionsFlowState {
  asOf: string;
  priorityAllowlist: string[];
  allowlist: string[];
  filters: string[];
  flows: OptionsFlowItem[];
}

export function loadOptionsFlow(): OptionsFlowState {
  return optionsJson as OptionsFlowState;
}
