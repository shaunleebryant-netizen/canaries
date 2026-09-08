import { readFileSync } from "fs";
import path from "path";
import type { CanaryState } from "./types";

export function loadState(): CanaryState {
  const file = path.join(process.cwd(), "data", "state.json");
  const raw = readFileSync(file, "utf8");
  return JSON.parse(raw) as CanaryState;
}
