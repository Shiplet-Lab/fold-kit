# Shiplet Runtime Kit

The open runtime contract for small applications.

Runtime Kit helps a project describe how it builds, starts, exposes health, and
connects to required services. The format is portable: use it with Shiplet,
Docker, CI, or your own platform.

## Quick start

```bash
npx @shiplet/runtime-kit shiplet-check
# or, from a checkout:
node bin/shiplet-check.mjs --json
```

The checker is read-only. It never uploads source code or secret values.

## Contract

Add `shiplet.yaml` when automatic detection is not enough:

```yaml
version: 1
runtime: node
build: npm run build
start: npm start
port: 3000
health: /health
```

See [`spec/runtime-contract.md`](spec/runtime-contract.md).

## Status

This is an early public foundation. The contract is intentionally small and
provider-neutral. Contributions are welcome under Apache-2.0.
