# Shiplet Runtime Kit

[![Runtime check](https://github.com/Shiplet-Lab/runtime-kit/actions/workflows/runtime-check.yml/badge.svg)](https://github.com/Shiplet-Lab/runtime-kit/actions/workflows/runtime-check.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

**An open, provider-neutral runtime contract and readiness checker for small applications.**

Small apps often fail at the handoff between “it works on my machine” and “the team can use it.” Runtime Kit makes that handoff explicit: how the app builds, how it starts, which port it uses, and how a platform can check its health.

Use it with Shiplet, Docker, CI, or your own infrastructure. The project is local-first and read-only: it does not upload your source code or read secret values.

## Why this exists

Runtime Kit catches deployment blockers before they become deployment incidents:

- missing start commands
- unclear or unsupported runtimes
- invalid ports and health paths
- accidental reliance on local `.env` files
- undocumented build behavior

It is deliberately small. The contract is portable and the hosted platform is replaceable.

## Quick start

Once the package is published, run it from any project directory:

```bash
npx @shiplet/runtime-kit --json
```

For now, run the checker from a checkout:

```bash
git clone https://github.com/Shiplet-Lab/runtime-kit
cd runtime-kit
node bin/shiplet-check.mjs --json
```

After the first npm release, you can install it globally:

```bash
npm install --global @shiplet/runtime-kit
shiplet-check
```

During local development in this repository:

```bash
npm run check
npm test
```

A successful check exits with code `0`. Critical findings exit with code `1`, so it can run safely in CI.

## Example output

```text
Shiplet Runtime Check · invoice-tool
Runtime: node · Port: 3000 · Health: /health
✓ Application has a usable runtime contract.

Ready for a deployment review.
```

For automation:

```bash
shiplet-check --json > runtime-report.json
```

```json
{
  "runtime": "node",
  "build": "npm run build",
  "start": "npm start",
  "port": 3000,
  "health": "/health",
  "ready": true
}
```

## Capsules

A Capsule is Shiplet’s portable application unit: source, runtime, health,
requirements, and access intent in one inspectable object. Start planning one
locally with:

```bash
node bin/shiplet.mjs capsule plan --json
```

Use [`spec/capsule.md`](spec/capsule.md) for the early v1 shape.

Generate a contract or compile a provider-neutral report:

```bash
shiplet capsule init
shiplet capsule compile --provider=docker
```

Compilation is intentionally metadata-only for now; it does not deploy or change
provider infrastructure. Capsules are
the bridge between an application and a provider: Shiplet can eventually
compile the same plan for Docker, Vercel, Cloudflare, Render, or another
platform without pretending to replace that provider’s infrastructure tools.

## Runtime contract

Automatic detection works for common Node projects. Add `shiplet.yaml` when you want an explicit, portable contract:

```yaml
version: 1
runtime: node
build: npm run build
start: npm start
port: 3000
health: /health
```

The v1 contract supports:

| Field | Required | Description |
| --- | --- | --- |
| `version` | yes | Contract version; currently `1` |
| `runtime` | yes | `node`, `python`, `ruby`, `php`, or `docker` |
| `build` | no | Build command |
| `start` | yes | Process start command |
| `port` | no | Listening port; defaults to `3000` |
| `health` | no | HTTP health path; defaults to `/` |

Never put secret values in `shiplet.yaml`. List secret **names** only, and provide values through the deployment environment.

Read the complete specification in [`spec/runtime-contract.md`](spec/runtime-contract.md) and follow the public [`ROADMAP.md`](ROADMAP.md).

## GitHub Actions

Add the checker to a project after installing the package:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: npm install --global @shiplet/runtime-kit
- run: shiplet-check --json
```

This repository also tests the checker against [`examples/sample-node`](examples/sample-node).

## Design principles

1. **Portable:** no provider-specific behavior in core fields.
2. **Read-only:** inspection does not execute application commands or upload source.
3. **Fail closed:** unknown contract versions and missing start commands are critical.
4. **CI-friendly:** stable JSON and meaningful exit codes.
5. **Small vocabulary:** new fields need a clear cross-provider use case.

## Project status

Runtime Kit is an early public foundation. Planned work includes:

- Python and Docker-specific detection
- framework starter templates
- provider adapter registry
- `shiplet init` contract generation
- editor integrations
- signed machine-readable reports

## Contributing

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md), then open an issue describing the use case or provider you want to support. Contract changes require compatibility notes and an example.

Security reports should follow [`SECURITY.md`](SECURITY.md), not a public issue.

## License

Apache-2.0. See [`LICENSE`](LICENSE).
