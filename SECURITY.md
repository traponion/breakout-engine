# Security Policy

## Scope

`breakout-engine` is a fully client-side, static project. It runs in the
browser with **no backend, no telemetry, and no collection of personal
data**. Its only network access is loading the site's own static assets
(see `DESIGN.md`, Server-Zero); it never calls external origins. There is
no server to attack and no data store to breach.

As a result, the realistic security surface is limited to:

- Issues in the build toolchain or dependencies (e.g. a vulnerable dev
  dependency).
- Repository or release-artifact integrity.
- Client-side issues such as unsafe DOM handling in the engine code.

## Reporting a Vulnerability

If you believe you have found a security issue, please report it privately via
a [GitHub security advisory](https://github.com/traponion/breakout-engine/security/advisories/new).

For non-sensitive, repository-level concerns, a regular
[issue](https://github.com/traponion/breakout-engine/issues) is also fine.

Please do not disclose a suspected vulnerability publicly until it has been
reviewed.

## Supported Versions

This project is pre-release. Only the latest `main` is supported.
