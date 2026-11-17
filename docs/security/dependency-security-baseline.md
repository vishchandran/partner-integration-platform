# Software supply-chain security baseline

## Required controls

- Commit `package-lock.json` and install with `npm ci`.
- Resolve dependencies from the configured npm registry.
- Disable dependency lifecycle scripts unless a reviewed exception is required.
- Pin GitHub Actions to reviewed commit SHAs.
- Grant workflows read-only token access and prevent checkout credential persistence.
- Audit production and complete dependency trees on dependency pull requests and weekly.
- Review Dependabot updates; major versions require compatibility testing.
- Pin build and development container images to reviewed versions rather than floating tags.
- Keep credentials and environment files out of source and workflow logs.

## Audit findings — 2026-11-17

| Finding | Severity | Evidence | Risk | Status |
| --- | --- | --- | --- | --- |
| No GitHub Actions security checks | High | Repository had no workflows. | Dependency changes and tests were not automatically validated. | Remediated with read-only CI and dependency-security workflows. |
| No automated dependency monitoring | Medium | No audit workflow or Dependabot configuration. | Vulnerabilities could remain unnoticed. | Remediated with PR/weekly audits and non-major update PRs. |
| Unrestricted lifecycle scripts | High | Standard npm behavior permitted install scripts. | A compromised package could execute during installation. | Remediated with `ignore-scripts=true`; no exception is currently required. |
| Floating Kafka image | High | Compose used `apache/kafka:latest`. | A future image change could alter the environment without review. | Pinned to the reviewed Apache Kafka 4.4.0 release. |
| No committed application Dockerfile | Informational | Only a local Kafka Compose file exists. | Application container-runtime hardening is not applicable today. | Reassess if an application image is introduced. |

## Validation and residual risk

The manifest, lockfile, Kafka Compose file, ignore rules, application structure, and tests were inspected. Partner onboarding, Kafka event processing, PostgreSQL access, API behavior, and business logic are unchanged.

GitHub Actions provide executed reproducible-install, audit, and test evidence. The Kafka version pin prevents silent movement but is not a digest pin; image updates require explicit review. Kafka uses plaintext listeners in this local-development Compose file and must not be treated as a production-secure broker configuration. Repository settings should additionally enforce required reviews, branch protection, secret scanning, and Dependabot alerts where available.
