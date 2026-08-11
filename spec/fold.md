# Fold v1

A Fold is a portable description of a small application and the operational
requirements needed to put it in front of real people. It is intentionally
provider-neutral; adapters translate it to Docker, Vercel, Cloudflare, Render,
or another platform.

```yaml
apiVersion: shiplet.dev/v1
kind: Fold
metadata:
  name: invoice-tool
runtime: node
stack: nextjs
build: npm run build
start: npm start
port: 3000
health: /health
```

The first implementation shares the Fold checker and produces a local,
read-only plan. Future versions add capability manifests, provider compilation,
and signed readiness receipts.
