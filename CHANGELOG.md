# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-31

### Added
- Initial release of @mtng/unstorage
- AWS S3 storage driver using AWS SDK v3
- Driver configuration options:
  - `readOnly` mode to prevent write operations
  - `allowClear` safety option (defaults to false)
  - `maxDepth` support for key filtering
  - `s3StoragePrefix` for bucket organization
  - Custom to allow native S3 options for encryption, metadata, and caching
- TypeScript support with exported type definitions
- Utility functions: serialize, deserialize, validateKey, toStorageKey
- Unit and E2e tests
- ESM and CJS builds with tree-shaking support

## [Unreleased]

### Added
- S3 drivers now accept optional `s3Client`; when omitted, the driver constructs an internal `S3Client` using the AWS SDK default provider chain.
- Support for optional inline AWS configuration when constructing an internal client: `region`, `accessKeyId`, `secretAccessKey`, and `sessionToken`.

### Changed
- Relax validation: `s3Client` is no longer required. Bucket name is still required. If any inline credential is provided, both `accessKeyId` and `secretAccessKey` must be set.

## [0.2.0] - 2025-11-01

### Added
- Add `aws-s3-flex` driver (phase 1 parity with `aws-s3`) — an opt-in alternative S3 driver for future flexibility.
- Centralize S3 helpers: moved S3-specific helpers to `src/drivers/aws-s3/shared.ts` and generic utilities to `src/utils.ts` (includes `streamToString`, `filterKeyByDepth`, `checkReadOnly`).
- Expose `./aws-s3-flex` subpath in package exports.

### Breaking
- Remove backward-compatible alias exports `toStorageKey`, `normalizeKey`, and `joinKey` in favor of explicit S3-specific helpers (`toS3StorageKey`, `normalizeS3Key`, `joinS3Key`). This is a breaking change and will be released in the next major version. Update any code that imports the old aliases to use the new names.
- Rename `awsS3DriverOptions` to `AwsS3DriverOptions` (capitalized) — this is a breaking type name change. Update any TypeScript imports to use `AwsS3DriverOptions`.