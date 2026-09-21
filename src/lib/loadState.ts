import type { CanaryState } from "./types";
import stateJson from "../../data/state.json";

/**
 * Load the weekly canary pack.
 * Bundled JSON import — works on Cloudflare Workers (no runtime fs).
 * Refresh by copying /home/box/canaries/state.json → data/state.json, then rebuild.
 */
export function loadState(): CanaryState {
  return stateJson as CanaryState;
}
