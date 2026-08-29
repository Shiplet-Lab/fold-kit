#!/usr/bin/env node
// MCP server: fold-lint — exposes Shiplet checks over Model Context Protocol (2025 fastest-adopted standard).
// Unique: first deploy checker with MCP; used by --ai-fix (Claude Code/Gemini Codex) to patch fold.yaml.
// Minimal stdio MCP: tools/list, tools/call=lint

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());

function lint() {
  try {
    const out = execFileSync(process.execPath, [join(import.meta.dirname, "shiplet-check.mjs"), "--json"], { cwd: root, encoding: "utf8" });
    return JSON.parse(out);
  } catch (e) {
    return { error: e.message };
  }
}

const handlers = {
  "initialize": () => ({ protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "fold-lint", version: "0.1.0" } }),
  "tools/list": () => ({ tools: [{ name: "lint", description: "Run Shiplet fold checks and return remediation", inputSchema: { type: "object", properties: {} } }, { name: "fix", description: "Apply --fix for .env gitignore patch", inputSchema: { type: "object", properties: {} } }] }),
  "tools/call": (p) => {
    if (p.name === "lint") return { content: [{ type: "text", text: JSON.stringify(lint(), null, 2) }] };
    if (p.name === "fix") { execFileSync(process.execPath, [join(import.meta.dirname, "shiplet-check.mjs"), "--fix"], { cwd: root }); return { content: [{ type: "text", text: "applied --fix" }] }; }
    throw new Error("unknown tool " + p.name);
  }
};

let buf = "";
process.stdin.on("data", (chunk) => {
  buf += chunk.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      const result = handlers[msg.method] ? handlers[msg.method](msg.params ?? {}) : { error: "unknown method" };
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }) + "\n");
    } catch (e) {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", error: { message: e.message } }) + "\n");
    }
  }
});
