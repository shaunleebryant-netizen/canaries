#!/usr/bin/env node
/** Thin wrapper → scripts/refresh-volume-breadth.py */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const py = join(__dirname, "refresh-volume-breadth.py");
const r = spawnSync("python3", [py, ...process.argv.slice(2)], {
  cwd: join(__dirname, ".."),
  encoding: "utf8",
  timeout: 120_000,
});
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
