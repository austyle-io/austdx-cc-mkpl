# Changelog

All notable changes to the `edf` plugin are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Initial 5-agent + 19-skill plugin layout.
- `README.md`, `LICENSE`, `CHANGELOG.md` at plugin root.
- L4 reference layers on `runbook-executor` and `runbook-strategist`.
- Skill-description disambiguation between scaffold/audit/stats families.

### Fixed
- `runbook-executor` tools array now includes `Agent`, `KillShell`,
  `TodoWrite` so its delegation and cleanup capabilities work at runtime.
- `edf-doc-reviewer` no longer references the non-existent `--fix` flag.
- `edf-author` refactoring guidance uses canonical `<!-- @layer:N -->`
  marker syntax (the `<!-- Layer N: Name -->` legacy form is removed).

### Changed
- `edf-doc-reviewer` Layer 2 rebalanced (Dimensions 4-6 demoted to L3;
  Interaction Style + Companion Components promoted from L4 to L2).
- Marketplace `edf` entry's `author` block now carries `url`.

## [0.1.0] - 2026-05-11

Initial release.
