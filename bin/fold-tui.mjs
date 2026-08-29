#!/usr/bin/env node
// Fold TUI — Ink/Bubbletea-style interactive playground (unique: none of Vercel/Railway/Coolify ship a TUI for deploy preflight)
// MVP: renders checks as selectable list; full Ink app in v0.3.
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
const root = resolve(process.cwd());
try {
  const out = execFileSync(process.execPath, [join(import.meta.dirname, "shiplet-check.mjs"), "--json"], { cwd: root, encoding: "utf8" });
  const r = JSON.parse(out);
  console.log(`\n  Fold TUI — ${r.project} · ${r.receipt}\n`);
  for (const c of r.checks) console.log(`  ${c.level === "pass" ? "✓" : c.level === "critical" ? "✗" : "!"} [${c.level}] ${c.message}`);
  console.log(`\n  Stack: ${r.stack}  Port: ${r.port}  Health: ${r.health}`);
  console.log(`  Secrets: ${r.secrets.names.join(", ") || "(none)"}`);
  console.log(`  Capabilities: ${r.capabilities.map(c=>c.kind).join(", ") || "(none)"}`);
  console.log(`\n  Tip: run with --cost preview to see provider deltas. Full Ink TUI lands in 0.3 (tracked in ROADMAP Phase 4).\n`);
} catch (e) {
  console.error("TUI: failed to run shiplet-check --json", e.message);
  process.exit(1);
}
