# Runtime contract v1

A `shiplet.yaml` file may contain:

| Key | Required | Meaning |
| --- | --- | --- |
| `version` | yes | Contract version; currently `1` |
| `runtime` | yes | `node`, `python`, `ruby`, `php`, or `docker` |
| `build` | no | Build command |
| `start` | yes | Runtime start command |
| `port` | no | Listening port, default `3000` |
| `health` | no | HTTP health path, default `/` |

The contract must never contain secret values. Names of required secrets may be
listed under `secrets`, but values belong in the deployment environment.

Implementations should fail closed when `version` is unknown or `start` is
missing. They may add provider-specific keys under an `x-` prefix.
