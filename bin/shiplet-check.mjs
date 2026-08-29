#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { createHash } from "node:crypto";

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const json = args.has("--json");
const reportFlag = args.has("--report");
const fixFlag = args.has("--fix");
const lockFlag = args.has("--lock");
const sbomFlag = args.has("--sbom");
const writeContract = args.has("--write-contract");
const providerArg = rawArgs.find((arg) => arg.startsWith("--provider="))?.split("=")[1];
const root = resolve(process.cwd());

const readJson = (file) => {
  try { return JSON.parse(readFileSync(join(root, file), "utf8")); } catch { return null; }
};
const parseContract = () => {
  const file = existsSync(join(root, "fold.yaml")) ? join(root, "fold.yaml") : join(root, "shiplet.yaml");
  if (!existsSync(file)) return null;
  const values = {};
  let rawLines = readFileSync(file, "utf8").split(/\r?\n/);
  let inSecrets = false;
  let secrets = [];
  for (const raw of rawLines) {
    if (/^\s*secrets\s*:/.test(raw)) { inSecrets = true; continue; }
    if (inSecrets) {
      const m = raw.match(/^\s*-\s*(.+)$/);
      if (m) { secrets.push(m[1].replace(/^['"]|['"]$/g, "")); continue; }
      if (/^\S/.test(raw) && !/^\s/.test(raw)) inSecrets = false;
    }
    const line = raw.replace(/\s+#.*$/, "").trim();
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  if (secrets.length) values.secrets = secrets;
  if (values.apiVersion === "shiplet.dev/fold/v1" && !values.version) values.version = "1";
  return values;
};

const pkg = readJson("package.json");
const contract = parseContract();
const scripts = pkg?.scripts ?? {};
const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
const requirementsText = existsSync(join(root, "requirements.txt")) ? readFileSync(join(root, "requirements.txt"), "utf8").toLowerCase() : "";
const hasFile = (p) => existsSync(join(root, p));

// stack detection — expanded per ROADMAP Phase 1
function detectStack() {
  if (contract?.stack) return contract.stack;
  if (deps.next || existsSync(join(root, "next.config.js")) || existsSync(join(root, "next.config.mjs"))) return "nextjs";
  if (deps["@remix-run/react"] || existsSync(join(root, "remix.config.js"))) return "remix";
  if (deps.astro || existsSync(join(root, "astro.config.mjs"))) return "astro";
  if (existsSync(join(root, "svelte.config.js")) || deps.svelte) return "sveltekit";
  if (deps.nuxt || deps["nuxt3"] || existsSync(join(root, "nuxt.config.ts"))) return "nuxt";
  if (deps.vite) return "vite";
  if (deps.express) return "express";
  if (deps["@hono/hono"] || deps.hono) return "hono";
  if (deps.fastify) return "fastify";
  if (requirementsText.includes("fastapi")) return "fastapi";
  if (requirementsText.includes("django")) return "django";
  if (requirementsText.includes("flask")) return "flask";
  if (existsSync(join(root, "Dockerfile"))) return "docker";
  if (pkg) return "node";
  if (existsSync(join(root, "requirements.txt"))) return "python";
  return "unknown";
}

function detectRuntime() {
  if (contract?.runtime) return contract.runtime;
  if (pkg || deps.next || deps.vite || deps.express) return "node";
  if (existsSync(join(root, "requirements.txt"))) return "python";
  if (existsSync(join(root, "Gemfile"))) return "ruby";
  if (existsSync(join(root, "composer.json"))) return "php";
  if (existsSync(join(root, "Dockerfile"))) return "docker";
  return "unknown";
}

const stack = detectStack();
const runtime = detectRuntime();
const build = contract?.build ?? (scripts.build ? "npm run build" : null);
const start = contract?.start ?? (scripts.start ? "npm start" : null);

// capability scan — lightweight, research-backed: network, storage, db, subprocess
function scanCapabilities() {
  const capabilities = [];
  const files = [];
  try {
    const entries = readdirSync(root);
    for (const e of entries) {
      if (e.startsWith(".") || e === "node_modules" || e === "dist" || e === ".shiplet") continue;
      const p = join(root, e);
      try { if (statSync(p).isFile() && /\.(ts|js|mjs|cjs|py|rb|php)$/.test(e)) files.push(p); } catch {}
    }
    // shallow scan subdirs for source
    for (const dir of ["src", "app", "lib", "server", "api"]) {
      const full = join(root, dir);
      if (!existsSync(full)) continue;
      try {
        for (const f of readdirSync(full)) {
          const p = join(full, f);
          try { if (statSync(p).isFile()) files.push(p); } catch {}
        }
      } catch {}
    }
  } catch {}

  let text = "";
  for (const f of files.slice(0, 40)) {
    try { text += readFileSync(f, "utf8") + "\n"; } catch {}
  }
  const t = text.slice(0, 80000);

  if (/DATABASE_URL|postgres|mysql|mongodb|redis|POSTGRES/i.test(t) || pkg?.dependencies && Object.keys(pkg.dependencies).some(k => /prisma|pg|mysql|mongoose|redis/i.test(k))) {
    capabilities.push({ kind: "database", label: "Database connection", detail: "Found DB env or driver (DATABASE_URL, prisma/pg/mongoose)." });
  }
  if (/fetch\s*\(|axios|got\(|https?:\/\//i.test(t)) {
    const hosts = [...new Set([...t.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map(m => m[1]).slice(0,5))];
    capabilities.push({ kind: "network", label: "Outbound network", detail: hosts.length ? `Hosts: ${hosts.join(", ")}` : "HTTP client detected (fetch/axios)." });
  }
  if (/multer|s3|aws-sdk|@aws-sdk|cloudinary|uploads/i.test(t)) {
    capabilities.push({ kind: "storage", label: "File uploads / storage", detail: "Upload or S3 usage detected." });
  }
  if (/child_process|exec\(|spawn\(|execSync/i.test(t)) {
    capabilities.push({ kind: "subprocess", label: "Subprocess execution", detail: "child_process usage — review for sandbox escape." });
  }
  if (/sharp|cffmpeg|puppeteer|playwright/i.test(t)) {
    capabilities.push({ kind: "native", label: "Native/binary dependency", detail: "Heavy native module detected — ensure Docker base supports it." });
  }
  return capabilities;
}

function parseEnvExample() {
  const names = [];
  for (const f of [".env.example", ".env.sample", "env.example"]) {
    if (!existsSync(join(root, f))) continue;
    const lines = readFileSync(join(root, f), "utf8").split(/\r?\n/);
    for (const l of lines) {
      const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=/);
      if (m) names.push(m[1]);
    }
  }
  return [...new Set(names)];
}

const capabilities = scanCapabilities();
const envExampleNames = parseEnvExample();
const contractSecrets = Array.isArray(contract?.secrets) ? contract.secrets : [];
const secretNames = [...new Set([...envExampleNames, ...contractSecrets])];

// checks with remediation (A5 progressive disclosure)
const checks = [];
const add = (id, level, message, remediation = null) => checks.push({ id, level, message, ...(remediation ? { remediation } : {}) });

if (!pkg && !existsSync(join(root, "Dockerfile")) && !existsSync(join(root, "shiplet.yaml")) && !existsSync(join(root, "fold.yaml"))) {
  add("project.detect", "critical", "No package.json, Dockerfile, or fold contract found.", "Run: npm init -y  or add fold.yaml with version: 1, runtime: node, start: 'node server.js'");
}
if (runtime === "unknown") add("runtime.detect", "review", "Runtime could not be detected; add fold.yaml.", "Create fold.yaml: version: 1, runtime: node, start: 'npm start'");
if (stack === "unknown") add("stack.detect", "review", "Framework stack could not be detected; add stack to fold.yaml.", "Set stack: nextjs | vite | express | fastapi | django in fold.yaml for better health guidance.");
if (!start) add("runtime.start", "critical", "No start command found; define start in fold.yaml or package.json.", "Add to fold.yaml: start: 'npm start'  or to package.json scripts.start");
if (build === null && runtime === "node") add("runtime.build", "review", "No build command found; confirm this is intentional.", "If this is a built app, set build: 'npm run build' in fold.yaml.");
if (contract && contract.version !== "1") add("contract.version", "critical", `Unsupported contract version: ${contract.version ?? "missing"}.`, "Set version: 1 in fold.yaml");

const port = Number(contract?.port ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) add("runtime.port", "critical", "Port must be an integer between 1 and 65535.", "Set port: 3000 in fold.yaml");
if (contract?.health && !contract.health.startsWith("/")) add("runtime.health", "review", "Health path should begin with '/'.", "Set health: /  or health: /health in fold.yaml");
if (existsSync(join(root, ".env")) && !existsSync(join(root, ".gitignore"))) add("secrets.env", "review", ".env exists locally; ensure it is gitignored and never commit secret values.", "Add '.env' to .gitignore; use .env.example for names only.");
if (existsSync(join(root, ".env")) && existsSync(join(root, ".gitignore"))) {
  const ig = readFileSync(join(root, ".gitignore"), "utf8");
  if (!ig.includes(".env")) add("secrets.gitignore", "review", ".env not listed in .gitignore.", "Append '.env' to .gitignore");
}
if (pkg?.engines?.node) {
  const m = String(pkg.engines.node).match(/(\d+)/);
  if (m && Number(m[1]) < 18) add("runtime.node-version", "review", `Node engine ${pkg.engines.node} is below 18; Fold targets Node 22.`, "Bump engines.node to '>=22' in package.json");
}
if (contract && typeof contract.secrets !== "undefined" && !Array.isArray(contract.secrets)) add("contract.secrets", "review", "secrets should be a list of names under 'secrets:', not inline values.", "Use:\nsecrets:\n  - DATABASE_URL\n  - API_KEY");
if (contract && contract.secrets && contract.secrets.some(s => /[:=]/.test(s) || s.length > 80)) add("contract.secrets-values", "critical", "fold.yaml appears to contain secret values, not just names.", "Replace values with names only; provide values via environment.");
if (!envExampleNames.length && secretNames.length === 0 && capabilities.some(c => c.kind === "database")) add("secrets.example", "review", "Database detected but no .env.example — add one so teammates know which vars to set.", "Create .env.example with:\nDATABASE_URL=\n# (no values)");
if (secretNames.length && !envExampleNames.length) add("secrets.inventory", "review", `Contract lists ${secretNames.length} secret name(s) but no .env.example found.`, "Create .env.example listing: " + secretNames.join(", "));
if (capabilities.some(c => c.kind === "subprocess")) add("capability.subprocess", "review", "Subprocess execution detected — ensure the platform sandbox allows it.", "Document required allow-list or move to worker/cron Fold kind.");

// health guidance per stack (research: reduce extraneous load)
const healthGuidance = (() => {
  if (stack === "nextjs") return "Use health: /api/health (add a tiny route returning 200) — better than '/' for Next.js ISR.";
  if (stack === "fastapi" || stack === "django" || stack === "flask") return "Use health: /health and expose it without auth.";
  if (stack === "vite") return "Vite preview needs health: / — or set start to 'vite preview --port $PORT'.";
  return null;
})();
if (healthGuidance && (contract?.health ?? "/") === "/") add("health.guidance", "review", healthGuidance, `Set health: /health in fold.yaml and add the route.`);

if (!checks.length) add("runtime.ready", "pass", "Application has a usable runtime contract.");

const ready = !checks.some((c) => c.level === "critical");
const receiptBase = `${pkg?.name ?? root.split("/").pop()}:${runtime}:${stack}:${port}:${start ?? ""}:${build ?? ""}:${ready}`;
const receiptHash = createHash("sha256").update(receiptBase).digest("hex").slice(0, 16);

const result = {
  kind: process.env.SHIPLET_KIND ?? "runtime",
  version: 1,
  spec: "shiplet.dev/fold/v1",
  project: pkg?.name ?? root.split("/").pop(),
  stack,
  runtime,
  build,
  start,
  port,
  health: contract?.health ?? "/",
  ready,
  receipt: `fold:${receiptHash}`,
  // research-backed fields
  capabilities,
  secrets: {
    names: secretNames,
    exampleFile: envExampleNames.length ? ".env.example" : null,
    exampleNames: envExampleNames,
    contractNames: contractSecrets,
  },
  healthGuidance,
  checks,
  // truck-factor-lite: repo file presence as proxy for bus factor
  meta: {
    hasGit: existsSync(join(root, ".git")),
    hasCI: existsSync(join(root, ".github/workflows")),
    generatedAt: new Date().toISOString(),
  },
};

// fix flag — auto-patch small issues
if (fixFlag) {
  if (!existsSync(join(root, ".gitignore"))) writeFileSync(join(root, ".gitignore"), ".env\nnode_modules/\n.shiplet/\n", { flag: "wx" });
  else if (!readFileSync(join(root, ".gitignore"), "utf8").includes(".env")) {
    const ig = readFileSync(join(root, ".gitignore"), "utf8");
    writeFileSync(join(root, ".gitignore"), ig + (ig.endsWith("\n") ? "" : "\n") + ".env\n");
  }
}

if (writeContract && !existsSync(join(root, "fold.yaml"))) {
  const lines = ["apiVersion: shiplet.dev/fold/v1", "kind: Fold", "metadata:", `  name: ${result.project}`, `runtime: ${runtime}`, `stack: ${stack}`, build ? `build: ${build}` : null, start ? `start: ${start}` : null, `port: ${port}`, `health: ${result.health}`, ...(secretNames.length ? ["secrets:", ...secretNames.map(s => `  - ${s}`)] : [])].filter(Boolean);
  writeFileSync(join(root, "fold.yaml"), `${lines.join("\n")}\n`, { flag: "wx" });
}

if (providerArg) {
  const supported = new Set(["docker", "vercel", "cloudflare", "render"]);
  if (!supported.has(providerArg)) { console.error(`Unsupported provider: ${providerArg} (supported: ${[...supported].join(", ")})`); process.exitCode = 2; }
  else {
    const outputDir = join(root, ".shiplet", "compiled");
    mkdirSync(outputDir, { recursive: true });
    const compiled = { provider: providerArg, capsule: result, generatedBy: "@shiplet-labs/fold", generatedAt: result.meta.generatedAt };
    writeFileSync(join(outputDir, `${providerArg}.json`), JSON.stringify(compiled, null, 2) + "\n");
    if (providerArg === "docker") {
      const pm = existsSync(join(root, "pnpm-lock.yaml")) ? "pnpm" : existsSync(join(root, "yarn.lock")) ? "yarn" : "npm";
      const install = runtime === "node"
        ? pm === "pnpm" ? "corepack enable && pnpm install --frozen-lockfile" : pm === "yarn" ? "corepack enable && yarn install --frozen-lockfile" : existsSync(join(root, "package-lock.json")) ? "npm ci" : "npm install"
        : runtime === "python" ? "pip install --no-cache-dir -r requirements.txt" : "echo 'Use the application Dockerfile for this runtime'";
      const run = start ?? "node server.js";
      const dockerfile = runtime === "python"
        ? `FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt ./\nRUN ${install}\nCOPY . .\nENV PORT=${port}\nEXPOSE ${port}\nUSER nobody\nHEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:${port}${result.health}')" \nCMD ["sh", "-c", "${run}"]\n`
        : `FROM node:22-slim\nWORKDIR /app\nCOPY package*.json ./\nRUN ${install}\nCOPY . .\nENV NODE_ENV=production PORT=${port}\nEXPOSE ${port}\nUSER node\nHEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:${port}${result.health}').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"\nCMD ["sh", "-c", "${run}"]\n`;
      writeFileSync(join(outputDir, "Dockerfile"), dockerfile);
      const healthCommand = runtime === "python"
        ? `python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:${port}${result.health}')"`
        : `node -e "fetch('http://127.0.0.1:${port}${result.health}').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"`;
      writeFileSync(join(outputDir, "docker-compose.yml"), `services:\n  app:\n    build:\n      context: ../..\n      dockerfile: .shiplet/compiled/Dockerfile\n    ports:\n      - "${port}:${port}"\n    environment:\n      PORT: "${port}"\n    healthcheck:\n      test: ["CMD-SHELL", "${healthCommand}"]\n      interval: 30s\n      timeout: 5s\n      retries: 3\n`);
    } else if (providerArg === "vercel") {
      writeFileSync(join(outputDir, "vercel.json"), JSON.stringify({
        version: 2,
        buildCommand: build ?? undefined,
        installCommand: "npm install",
        framework: stack === "nextjs" ? "nextjs" : undefined,
        env: Object.fromEntries(secretNames.map(k => [k, "@" + k])),
      }, null, 2) + "\n");
      writeFileSync(join(outputDir, "README.md"), `# Vercel compile\nGenerated by @shiplet-labs/fold for ${result.project}. Import this repo to Vercel and set env: ${secretNames.join(", ") || "(none)"}\n`);
    } else if (providerArg === "cloudflare") {
      writeFileSync(join(outputDir, "wrangler.toml"), `# Generated by @shiplet-labs/fold\nname = "${result.project}"\ncompatibility_date = "2024-01-01"\n# vars: ${secretNames.join(", ") || "(none)"} — set via dashboard, not here\n`);
      writeFileSync(join(outputDir, "README.md"), `# Cloudflare compile\nAdd to Cloudflare Pages/Workers. Secrets: ${secretNames.join(", ") || "(none)"} via bindings.\n`);
    } else if (providerArg === "render") {
      writeFileSync(join(outputDir, "render.yaml"), `services:\n  - type: web\n    name: ${result.project}\n    env: ${runtime}\n    buildCommand: ${build ?? "npm install"}\n    startCommand: ${start ?? "npm start"}\n    envVars:\n${secretNames.map(s => `      - key: ${s}\n        sync: false`).join("\n") || "      # (none)"}\n`);
    }
  }
}

// champion deck per Ven & Verelst — paste-to-Slack report
if (reportFlag) {
  const lines = [
    `# Fold Report — ${result.project}`,
    ``,
    `Stack: **${stack}** · Runtime: **${runtime}** · Port: **${port}** · Ready: **${ready ? "Yes" : "No — fix critical"}**`,
    `Receipt: \`${result.receipt}\` · ${result.meta.generatedAt}`,
    ``,
    `## Checks`,
    ...checks.map(c => `- **${c.level}** \`${c.id}\`: ${c.message}${c.remediation ? ` → _${c.remediation.split("\n")[0]}_` : ""}`),
    ``,
    `## Secrets (names only)`,
    secretNames.length ? secretNames.map(s => `- ${s}`).join("\n") : "_none detected — add .env.example if needed_",
    ``,
    `## Capabilities`,
    capabilities.length ? capabilities.map(c => `- **${c.kind}**: ${c.detail}`).join("\n") : "_no special capabilities detected_",
    ``,
    `> Paste this into Slack → bottom-up champion → org buy-in (boundary spanner).`,
  ];
  writeFileSync(join(root, "FOLD_REPORT.md"), lines.join("\n") + "\n");
}

// reproducible lockfile — Score Stability + SLSA provenance input (unique fold.lock)
if (lockFlag) {
  const lock = {
    version: 1,
    spec: result.spec,
    receipt: result.receipt,
    project: result.project,
    stack: result.stack,
    runtime: result.runtime,
    build: result.build,
    start: result.start,
    port: result.port,
    health: result.health,
    ready: result.ready,
    capabilities,
    secrets: result.secrets,
    checks: checks.map(c => ({ id: c.id, level: c.level })),
    meta: result.meta,
  };
  const lockJson = JSON.stringify(lock, null, 2) + "\n";
  mkdirSync(join(root, ".shiplet"), { recursive: true });
  writeFileSync(join(root, ".shiplet", "fold.lock"), lockJson);
  const sig = createHash("sha256").update(lockJson).digest("hex");
  writeFileSync(join(root, ".shiplet", "fold.lock.sig"), `sha256:${sig} # verify: sha256sum .shiplet/fold.lock\n# sign: cosign sign-blob --yes .shiplet/fold.lock --output-signature .shiplet/fold.lock.sigstore\n`);
}

// SBOM (CycloneDX 1.5) — for deps.dev linkage & Scorecard Dependency-Update
if (sbomFlag) {
  const components = Object.entries(deps).slice(0, 120).map(([name, ver]) => ({ name, version: String(ver).replace(/^[\^~]/, ""), type: "library", purl: `pkg:npm/${name}@${String(ver).replace(/^[\^~]/, "")}` }));
  const sbom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${receiptHash}`,
    version: 1,
    metadata: {
      timestamp: result.meta.generatedAt,
      component: { name: result.project, type: "application", version: pkg?.version ?? "0.0.0", bomRef: result.project },
      tools: { components: [{ name: "@shiplet-labs/fold", version: pkg?.version ?? "0.0.0", type: "application" }] },
    },
    components,
  };
  mkdirSync(join(root, ".shiplet"), { recursive: true });
  writeFileSync(join(root, ".shiplet", "sbom.cyclonedx.json"), JSON.stringify(sbom, null, 2) + "\n");
}

// cost simulator — unique local pre-flight (Vercel/Railway not doing)
if (rawArgs.includes("--cost")) {
  const provider = rawArgs.find(a => a.startsWith("--cost="))?.split("=")[1] ?? "shiplet";
  const estimates = {
    shiplet: "$2–5/mo (Fargate Spot 0.25vCPU) + private network",
    vercel: "$20 + $0.15/GB over 100GB (great for Next.js, not for DB/workers)",
    railway: "$5 credit + ~$5-10 Postgres, pay per GB-s",
    coolify: "$6-20 VPS flat + you manage",
  };
  result.costEstimate = { provider, estimate: estimates[provider] ?? estimates.shiplet, note: "Local simulation — see scripts/cost-model.mjs for full model" };
  if (!json) console.log(`\nCost (${provider}): ${result.costEstimate.estimate}`);
}

// preview tunnel hint — provider-neutral ephemeral link
if (rawArgs.includes("--preview")) {
  if (!json) console.log(`\nPreview: npx --yes cloudflared tunnel --url http://localhost:${port}\n→ Private link (10 min) via trycloudflare.com — no cloud account needed.`);
  result.previewHint = `cloudflared tunnel --url http://localhost:${port}`;
}

if (json) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`${result.kind === "capsule" ? "Shiplet Capsule Plan" : "Shiplet Runtime Check"} · ${result.project} · ${result.receipt}`);
  console.log(`Stack: ${stack} · Runtime: ${runtime} · Port: ${port} · Health: ${result.health}`);
  if (secretNames.length) console.log(`Secrets: ${secretNames.join(", ")} (names only)`);
  if (capabilities.length) console.log(`Capabilities: ${capabilities.map(c => c.kind).join(", ")}`);
  for (const check of checks) console.log(`${check.level === "pass" ? "✓" : check.level === "critical" ? "✗" : "!"} ${check.message}${check.remediation ? `\n  → ${check.remediation.split("\n")[0]}` : ""}`);
  if (reportFlag) console.log(`\nWrote FOLD_REPORT.md`);
  console.log(result.ready ? "\nReady for a deployment review." : "\nNot ready: resolve critical findings first.");
}
process.exitCode = result.ready ? 0 : 1;
