# Shiplet Fold Kit roadmap

The Fold Kit is the open-source foundation for Shiplet Folds. The roadmap
is organized around one promise: make small applications easier to understand,
prepare, move, and operate.

## Phase 0 — Foundation (complete)

- [x] Apache-2.0 repository and contribution policy
- [x] Runtime contract v1
- [x] Fold manifest draft
- [x] Read-only CLI with stable JSON output
- [x] Node, Python, Docker, Next.js, Vite, Express, FastAPI, and Django detection
- [x] GitHub Actions validation
- [x] Example application

## Phase 1 — Useful locally (next)

- [x] `fold plan`
- [x] `fold validate`
- [x] `fold init` without overwriting existing files
- [x] Provider-neutral compiled reports
- [x] Actionable remediation suggestions (every check now has `remediation` field)
- [x] `.env.example` requirement inventory (secrets.names / exampleNames / contractNames)
- [x] Framework-specific health-check guidance (Next.js → `/api/health`, Vite, Python etc.)
- [x] Champion report `FOLD_REPORT.md` via `--report` (boundary-spanner per Ven 2011)
- [ ] `create-shiplet-app` starter command (use `npx @shiplet/fold fold init` today)
- [x] Published npm package (`@shiplet-labs/fold@0.1.1`; source aligned for `0.1.2`)

## Phase 2 — Provider adapters

- [x] Initial Docker adapter that emits a Dockerfile and compose service (non-root + HEALTHCHECK)
- [x] Vercel adapter (`vercel.json` + provider README)
- [x] Cloudflare adapter (`wrangler.toml` + bindings inventory)
- [x] Render adapter (`render.yaml` with `envVars` sync: false)
- [x] `--fix` auto-patches `.gitignore` for `.env` leak
- [ ] Adapter conformance test suite (ship with 4 golden-file tests)
- [ ] Public compatibility matrix (docs/COMPATIBILITY.md)

## Phase 3 — Safer delivery

- [x] Capability manifest (network / database / storage / subprocess / native) via shallow scan
- [x] Secret names and ownership model without secret values (secrets.names, never values)
- [x] Signed readiness receipts (`receipt: fold:<short-sha256>`, stable `spec: shiplet.dev/fold/v1`)
- [x] Reproducible plan files for CI and code review (`.shiplet/compiled/{provider}.json` with `generatedAt`)
- [x] Security review workflow and responsible disclosure process (SECURITY.md)

## Phase 4 — Fold runtime

- [ ] Local `fold dev` environment
- [ ] Preview environments
- [ ] Health and readiness lifecycle
- [ ] Portable release metadata
- [ ] Rollback-compatible deployment records

## Phase 5 — Shiplet Cloud integration

- [ ] Import a Fold from GitHub
- [ ] Managed deployment and logs
- [ ] Private application gateway
- [ ] Team invitations and app-only access
- [ ] Managed data and encrypted secrets
- [ ] Audit history and recovery controls

## How roadmap decisions are made

Contract changes must remain provider-neutral and include an example. Provider
adapters may evolve independently. Security and portability take priority over
adding more framework-specific convenience.

This roadmap is directional, not a promise of dates. Propose changes through a
GitHub issue or discussion with a concrete user problem and example project.
