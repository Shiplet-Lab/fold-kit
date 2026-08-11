import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cli = join(process.cwd(), "bin/shiplet-check.mjs");

test("reports a ready node project as JSON", () => {
  const dir = mkdtempSync(join(tmpdir(), "shiplet-runtime-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "demo", scripts: { build: "npm run build", start: "node server.js" } }));
  const output = execFileSync(process.execPath, [cli, "--json"], { cwd: dir, encoding: "utf8" });
  const result = JSON.parse(output);
  assert.equal(result.ready, true);
  assert.equal(result.runtime, "node");
});

test("fails when no start command exists", () => {
  const dir = mkdtempSync(join(tmpdir(), "shiplet-runtime-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "demo" }));
  assert.throws(() => execFileSync(process.execPath, [cli, "--json"], { cwd: dir, encoding: "utf8" }));
});

test("detects a Next.js stack", () => {
  const dir = mkdtempSync(join(tmpdir(), "shiplet-fold-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "web", dependencies: { next: "latest" }, scripts: { start: "next start" } }));
  const result = JSON.parse(execFileSync(process.execPath, [cli, "--json"], { cwd: dir, encoding: "utf8" }));
  assert.equal(result.stack, "nextjs");
});

test("compiles a Docker deployment bundle without secrets", () => {
  const dir = mkdtempSync(join(tmpdir(), "shiplet-fold-"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "web", scripts: { start: "node server.js" } }));
  execFileSync(process.execPath, [cli, "--provider=docker", "--json"], { cwd: dir, encoding: "utf8" });
  const dockerfile = readFileSync(join(dir, ".shiplet", "compiled", "Dockerfile"), "utf8");
  assert.match(dockerfile, /USER node/);
  assert.doesNotMatch(dockerfile, /SECRET|TOKEN|PASSWORD/);
  assert.match(readFileSync(join(dir, ".shiplet", "compiled", "docker-compose.yml"), "utf8"), /healthcheck:/);
});
