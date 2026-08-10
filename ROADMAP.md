# Shiplet Runtime Kit roadmap

The Runtime Kit is the open-source foundation for Shiplet Capsules. The roadmap
is organized around one promise: make small applications easier to understand,
prepare, move, and operate.

## Phase 0 — Foundation (complete)

- [x] Apache-2.0 repository and contribution policy
- [x] Runtime contract v1
- [x] Capsule manifest draft
- [x] Read-only CLI with stable JSON output
- [x] Node, Python, Docker, Next.js, Vite, Express, FastAPI, and Django detection
- [x] GitHub Actions validation
- [x] Example application

## Phase 1 — Useful locally (next)

- [x] `capsule plan`
- [x] `capsule validate`
- [x] `capsule init` without overwriting existing files
- [x] Provider-neutral compiled reports
- [ ] Actionable remediation suggestions
- [ ] `.env.example` requirement inventory
- [ ] Framework-specific health-check guidance
- [ ] `create-shiplet-app` starter command
- [ ] Published npm package

## Phase 2 — Provider adapters

- [ ] Docker adapter that emits a Dockerfile and compose service
- [ ] Vercel adapter for framework and environment metadata
- [ ] Cloudflare adapter for Wrangler metadata and bindings review
- [ ] Render adapter
- [ ] Adapter conformance test suite
- [ ] Public compatibility matrix

## Phase 3 — Safer delivery

- [ ] Capability manifest for network, database, uploads, and subprocesses
- [ ] Secret names and ownership model without secret values
- [ ] Signed readiness receipts tied to a commit
- [ ] Reproducible plan files for CI and code review
- [ ] Security review workflow and responsible disclosure process

## Phase 4 — Capsule runtime

- [ ] Local `capsule dev` environment
- [ ] Preview environments
- [ ] Health and readiness lifecycle
- [ ] Portable release metadata
- [ ] Rollback-compatible deployment records

## Phase 5 — Shiplet Cloud integration

- [ ] Import a Capsule from GitHub
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
