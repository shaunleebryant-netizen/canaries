import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptyLedger, type PreviewLedger } from "./previewFulfillment";

const FILE = path.join(process.cwd(), "data", "preview-fulfillment.json");

export async function readPreviewLedger(): Promise<PreviewLedger> {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8")) as PreviewLedger;
    return {
      checkouts: parsed.checkouts ?? [],
      events: parsed.events ?? [],
      entitlements: parsed.entitlements ?? [],
      backup: parsed.backup ?? [],
    };
  } catch {
    return emptyLedger();
  }
}

export async function writePreviewLedger(ledger: PreviewLedger): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(ledger, null, 2));
}
