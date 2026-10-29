## [4.0.0](https://github.com/taleland/nestjs-auth0/compare/v3.0.0...v4.0.0) (2026-10-29)

### ⚠ BREAKING CHANGES

* upgrade p-memoize and require Node.js 22 (#64)

### Features

* support NestJS 12 with aligned development dependencies ([#69](https://github.com/taleland/nestjs-auth0/issues/69)) ([c2b66ad](https://github.com/taleland/nestjs-auth0/commit/c2b66ad3ab7e8c9763d8d5485091804c97d249c6))

### Bug Fixes

* align NestJS common and release tooling dependencies ([#63](https://github.com/taleland/nestjs-auth0/issues/63)) ([e91a0f2](https://github.com/taleland/nestjs-auth0/commit/e91a0f22fd69cd235825a9bdb589ff3d42c01417))

### Build System

* upgrade p-memoize and require Node.js 22 ([#64](https://github.com/taleland/nestjs-auth0/issues/64)) ([f29dbca](https://github.com/taleland/nestjs-auth0/commit/f29dbca82bc9c1d9611bfcb8ff8b9435ce2cac88))

## [3.0.0](https://github.com/taleland/nestjs-auth0/compare/v2.0.0...v3.0.0) (2026-10-27)

### ⚠ BREAKING CHANGES

* drain is no longer exported. Consumers must implement pagination themselves or use the Auth0 SDK pagination facilities.

### Code Refactoring

* remove drain helper and require conventional commits ([#58](https://github.com/taleland/nestjs-auth0/issues/58)) ([2e3cebd](https://github.com/taleland/nestjs-auth0/commit/2e3cebd507c581555d046eca54cecb8e4d4a4c1d))

## [2.0.0](https://github.com/taleland/nestjs-auth0/compare/v1.1.0...v2.0.0) (2026-03-31)

### ⚠ BREAKING CHANGES

* Now predicate is required option

Signed-off-by: Egor Andrianov <talentumtuum@pm.me>

### Features

* required predicate ([#17](https://github.com/taleland/nestjs-auth0/issues/17)) ([a64af6b](https://github.com/taleland/nestjs-auth0/commit/a64af6b29257d125cd7f7882dcc11305536b009f))

## [1.1.0](https://github.com/taleland/nestjs-auth0/compare/v1.0.2...v1.1.0) (2026-03-31)

### Features

* optional memoization ([#16](https://github.com/taleland/nestjs-auth0/issues/16)) ([654052e](https://github.com/taleland/nestjs-auth0/commit/654052e3ff44bfba061f6254b1e363c70e2e39e2))

## [1.0.2](https://github.com/taleland/nestjs-auth0/compare/v1.0.1...v1.0.2) (2026-03-13)

### Bug Fixes

* optimize package metadata for npm discoverability & some ci changes ([#2](https://github.com/taleland/nestjs-auth0/issues/2)) ([07ee844](https://github.com/taleland/nestjs-auth0/commit/07ee8440eedd40ac4f53ed3a84b68da95dda94fa))

## [1.0.1](https://github.com/taleland/nestjs-auth0/compare/v1.0.0...v1.0.1) (2026-03-13)

### Bug Fixes

* **deps:** move auth0 to peer dependencies and relax version ranges ([#1](https://github.com/taleland/nestjs-auth0/issues/1)) ([8054db7](https://github.com/taleland/nestjs-auth0/commit/8054db7eb2f5f1741048c453c58d249223fff47a))

## 1.0.0 (2026-03-12)

### Features

* initial commit ([915431a](https://github.com/taleland/nestjs-auth0/commit/915431a785f7ebe36c6839afbf62a6269d94e59f))
