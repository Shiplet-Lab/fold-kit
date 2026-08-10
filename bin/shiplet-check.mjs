#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const root = resolve(process.cwd());
const readJson = (file) => {
  try { return JSON.parse(readFileSync(join(root, file), "utf8")); } catch { return null; }
};
const parseContract = () => {
  const file = existsSync(join(root, "capsule.yaml")) ? join(root, "capsule.yaml") : join(root, "shiplet.yaml");
  if (!existsSync(file)) return null;
  const values = {};
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "").trim();
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return values;
};
const pkg = readJson("package.json");
const contract = parseContract();
const scripts = pkg?.scripts ?? {};
const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
const requirementsText = existsSync(join(root, "requirements.txt")) ? readFileSync(join(root, "requirements.txt"), "utf8").toLowerCase() : "";
const stack = contract?.stack ?? (deps.next ? "nextjs" : deps.vite ? "vite" : deps.express ? "express" : requirementsText.includes("fastapi") ? "fastapi" : requirementsText.includes("django") ? "django" : existsSync(join(root, "Dockerfile")) ? "docker" : pkg ? "node" : existsSync(join(root, "requirements.txt")) ? "python" : "unknown");
const runtime = contract?.runtime ?? (pkg || deps.next || deps.vite || deps.express ? "node" : existsSync(join(root, "requirements.txt")) ? "python" : existsSync(join(root, "Dockerfile")) ? "docker" : "unknown");
const build = contract?.build ?? (scripts.build ? "npm run build" : null);
const start = contract?.start ?? (scripts.start ? "npm start" : null);
const checks = [];
const add = (id, level, message) => checks.push({ id, level, message });
if (!pkg && !existsSync(join(root, "Dockerfile")) && !existsSync(join(root, "shiplet.yaml")) && !existsSync(join(root, "capsule.yaml"))) add("project.detect", "critical", "No package.json, Dockerfile, or shiplet.yaml found.");
if (runtime === "unknown") add("runtime.detect", "review", "Runtime could not be detected; add capsule.yaml.");
if (stack === "unknown") add("stack.detect", "review", "Framework stack could not be detected; add stack to capsule.yaml.");
if (!start) add("runtime.start", "critical", "No start command found; define start in capsule.yaml or package.json.");
if (build === null && runtime === "node") add("runtime.build", "review", "No build command found; confirm this is intentional.");
if (contract && contract.version !== "1") add("contract.version", "critical", `Unsupported runtime contract version: ${contract.version ?? "missing"}.`);
const port = Number(contract?.port ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) add("runtime.port", "critical", "Port must be an integer between 1 and 65535.");
if (contract?.health && !contract.health.startsWith("/")) add("runtime.health", "review", "Health path should begin with '/'.");
if (existsSync(join(root, ".env"))) add("secrets.env", "review", ".env exists locally; never commit secret values.");
if (!checks.length) add("runtime.ready", "pass", "Application has a usable runtime contract.");
const result = { kind: process.env.SHIPLET_KIND ?? "runtime", version: 1, project: pkg?.name ?? root.split("/").pop(), stack, runtime, build, start, port, health: contract?.health ?? "/", checks, ready: !checks.some((check) => check.level === "critical") };
if (json) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`${result.kind === "capsule" ? "Shiplet Capsule Plan" : "Shiplet Runtime Check"} · ${result.project}`);
  console.log(`Stack: ${stack} · Runtime: ${runtime} · Port: ${port} · Health: ${result.health}`);
  for (const check of checks) console.log(`${check.level === "pass" ? "✓" : check.level === "critical" ? "✗" : "!"} ${check.message}`);
  console.log(result.ready ? "\nReady for a deployment review." : "\nNot ready: resolve critical findings first.");
}
process.exitCode = result.ready ? 0 : 1;
