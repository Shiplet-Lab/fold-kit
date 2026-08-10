# Architecture

```text
project files ──> detector ──> normalized runtime result ──> text/JSON/CI
       │                │
       └─ shiplet.yaml ─┘
```

The checker has three boundaries:

- **Detection:** reads metadata such as `package.json`, `Dockerfile`, and
  `shiplet.yaml`.
- **Validation:** produces portable findings with `pass`, `review`, or
  `critical` severity.
- **Integration:** emits human-readable output or stable JSON for platforms and
  CI systems.

The checker must remain local and read-only. Hosted deployment, access control,
secrets, and recovery belong to Shiplet or another platform implementation.
