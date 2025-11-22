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
- New subpath exports for better tree-shaking and API organization:
  - `@mtngtools/unstorage/types` - All common types
  - `@mtngtools/unstorage/utils` - All utilities
  - `@mtngtools/unstorage/drivers/aws-s3` - S3 base driver, flex driver, types, and helpers
- **Dual import strategy support**: The package now supports both convenience imports (from root) and granular imports (from subpaths). All exports are available from the main entry point for convenience, while subpath imports provide better tree-shaking for production builds.

### Changed
- Relax validation: `s3Client` is no longer required. Bucket name is still required. If any inline credential is provided, both `accessKeyId` and `secretAccessKey` must be set.
- **Main entry point**: Now exports everything (drivers, types, utilities, helpers) for convenience, while maintaining subpath exports for granular imports and optimal tree-shaking.

### Breaking Changes
- **Subpath imports recommended for production**: While driver-specific exports are still available from the main entry point, using subpath imports is recommended for production builds to optimize bundle size:
  ```typescript
  // Convenience import (from root) - everything available
  import { awsS3Driver, AwsS3DriverOptions, validateKey } from '@mtngtools/unstorage';
  
  // Granular import (from subpaths) - better tree-shaking, recommended for production
  import { awsS3Driver, awsS3FlexDriver, AwsS3DriverOptions, toS3StorageKey } from '@mtngtools/unstorage/drivers/aws-s3';
  import { validateKey } from '@mtngtools/unstorage/utils';
  import type { MTBaseDriverOptions } from '@mtngtools/unstorage/types';
  ```

## [0.2.0] - 2025-11-01

### Added
- Add `aws-s3-flex` driver (phase 1 parity with `aws-s3`) — an opt-in alternative S3 driver for future flexibility.
- Centralize S3 helpers: moved S3-specific helpers to `src/drivers/aws-s3/shared.ts` and generic utilities to `src/utils.ts` (includes `streamToString`, `filterKeyByDepth`, `checkReadOnly`).
- Expose `./aws-s3-flex` subpath in package exports.

### Breaking
- Remove backward-compatible alias exports `toStorageKey`, `normalizeKey`, and `joinKey` in favor of explicit S3-specific helpers (`toS3StorageKey`, `normalizeS3Key`, `joinS3Key`). This is a breaking change and will be released in the next major version. Update any code that imports the old aliases to use the new names.
- Rename `awsS3DriverOptions` to `AwsS3DriverOptions` (capitalized) — this is a breaking type name change. Update any TypeScript imports to use `AwsS3DriverOptions`.