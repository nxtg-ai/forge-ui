# forge-ui documentation

Start with the [README](../README.md): what forge-ui is, how to install it, sign-in and network access. These pages go further.

## Using forge-ui

- [Ports](./architecture/PORT-CONFIGURATION.md): the two ports, opening the dashboard from another device, changing ports
- [Local client authentication](./api/LOCAL-CLIENT-AUTH.md): the access token, sign-in links, and how tools and WebSocket clients authenticate
- [API reference (OpenAPI)](./api/openapi.yaml): also served by a running forge-ui at `/api/docs`. It covers part of the API; the spec says which routes are not described yet.
- [Commands](./commands/README.md): the npm scripts, and where the Forge slash commands live

## Contributing

- [Testing guide](./guides/TESTING-GUIDE.md): running the tests, coverage, the browser test, and what CI runs
- [Best practices](./best-practices/README.md): code, testing and review conventions
- [Runtime state vs versioned config](./architecture/RUNTIME-STATE-SPLIT.md): which governance files are local state and which are config
- [Checkpoint manager](./guides/checkpoint-manager-usage.md): saving and restoring task checkpoints
- [ErrorBoundary](./components/ErrorBoundary-Usage.md): the React error boundary
- [Maintenance daemon](./maintenance/README.md): `npm run maintain`
- Components: the source in `src/components/layout/` is the reference for [AppHeader](./components/AppHeader.md) and [AppShell](./components/AppShell-Architecture.md)

## Records

- [Security scanner triage, 2026-10-07](./security/2026-10-07-scanner-triage.md): a historical record; the findings are fixed
- [Archive](./archive/README.md): historical working notes. They do not describe the released product.

The changelog is [CHANGELOG.md](../CHANGELOG.md). The license is [FSL-1.1-ALv2](../LICENSE.md).
