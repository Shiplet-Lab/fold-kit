# Compatibility Matrix — Fold Kit

| Capability | Docker | Vercel | Cloudflare | Render | Shiplet Cloud |
|---|---|---|---|---|---|
| `runtime: node` (Next/Vite/Express) | ✅ Dockerfile | ✅ `vercel.json` | ✅ `wrangler.toml` | ✅ `render.yaml` | ✅ managed |
| `python` | ✅ `python:3.12` | — (function) | — | ✅ | ✅ |
| `health` | HEALTHCHECK | — | — | healthCheck | gateway probe |
| `secrets` as names | `env sync:false` | `env: "@KEY"` | comment | `sync:false` | encrypted at rest |
| `capabilities` scan | emitted | emitted | emitted | emitted | enforced |

Matrix is reproducible: `shiplet-check --sbom` → `deps.dev` for provenance; `fold.lock` is the policy-diff input for `fold policy diff main`.

Branch protection + `CODEOWNERS` + `publishConfig.provenance:true` → Scorecard `Code-Review:10`, `Branch-Protection:10`, `Packaging:10`.
