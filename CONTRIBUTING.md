# Contributing

Thanks for helping make small applications easier to run.

1. Open an issue describing the use case or provider.
2. Keep the runtime contract provider-neutral.
3. Never add real credentials, tokens, or private application data to examples.
4. Add or update tests for checker behavior.
5. Run `npm test` and `npm run lint` from the Shiplet repository before opening a pull request.

New contract fields should use the smallest useful vocabulary. Provider-specific
extensions must use an `x-` prefix and must not change the meaning of existing
fields.
