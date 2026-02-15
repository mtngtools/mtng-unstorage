# @mtngtools/unstorage

> [!WARNING]
> This package is under active development and likely will have breaking changes.


A TypeScript library providing storage drivers for [unstorage](https://github.com/unjs/unstorage) with support for various cloud storage backends, designed to extend the capabilities of unstorage with drivers not currently built in.

[![npm version](https://badge.fury.io/js/@mtngtools%2Funstorage.svg)](https://badge.fury.io/js/@mtngtools%2Funstorage)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

### Current Drivers

- **[AWS S3 Driver](./docs/drivers/aws-s3.md)** – AWS S3 storage using the [AWS SDK for JavaScript](https://github.com/aws/aws-sdk-js-v3).
- **[AWS S3 Flex Driver](./docs/drivers/aws-s3.md#flex-driver-custom-mapping)** – Adds custom key and value mapping hooks on top of the S3 driver.
- **[AWS SSM Driver](./docs/drivers/aws-ssm.md)** – AWS Systems Manager Parameter Store using the [AWS SDK for JavaScript](https://github.com/aws/aws-sdk-js-v3).
- **[AWS SSM Flex Driver](./docs/drivers/aws-ssm.md#flex-driver-custom-mapping)** – Adds custom key and value mapping hooks on top of the SSM driver.
- **[AWS DynamoDB Driver](./docs/drivers/aws-dynamodb.md)** – AWS DynamoDB storage using the [AWS SDK for JavaScript](https://github.com/aws/aws-sdk-js-v3).

### Planned Driver Features

- **Auto-versioned writes** - Store as current value, but also with copy as timestamped version (not to be overwritten)
- **Load version** - Load prior version instead of current value

## Features

- **TypeScript First**: Built with TypeScript for better developer experience
- **Additional Features**: Read-only mode, default clear protection, maxDepth filtering
- **Tested**: Unit and E2E tests
- **Tree Shakeable**: ESM and CJS builds with proper tree shaking, supports both convenience and granular imports
- **Type Safe**: Full TypeScript support with detailed type definitions
- **Flexible Imports**: Support both convenience imports (from root) and granular imports (from subpaths) for optimal tree-shaking

## Quick Start

### Installation

```bash
pnpm install @mtngtools/unstorage
```

### Import Strategies

The package supports two import strategies:

**1. Convenience imports (from root)** - Everything available in one import:
```typescript
import { awsS3Driver, awsSsmDriver, AwsS3DriverOptions, validateKey } from '@mtngtools/unstorage'
```

**2. Granular imports (from subpaths)** - Better tree-shaking, recommended for production:
```typescript
import { awsS3Driver } from '@mtngtools/unstorage/drivers/aws-s3'
import { awsSsmDriver } from '@mtngtools/unstorage/drivers/aws-ssm'
import { validateKey } from '@mtngtools/unstorage/utils'
import type { MTBaseDriverOptions } from '@mtngtools/unstorage/types'
```

Both strategies work identically. Use subpath imports for production builds to optimize bundle size.

### AWS S3 Driver

```bash
# Install required peer dependencies for S3 and unstorage if not already installed
pnpm install @aws-sdk/client-s3 unstorage
```

**Convenience import (from root):**
```typescript
import { createStorage } from 'unstorage'
import { S3Client } from '@aws-sdk/client-s3'
import { awsS3Driver } from '@mtngtools/unstorage'

// Create storage instance
const storage = createStorage({
  driver: awsS3Driver({
    bucket: 'my-storage-bucket'
  })
})

// Use the storage
await storage.setItem('user:123', { name: 'John', email: 'john@example.com' })
const user = await storage.getItem('user:123')
console.log(user) // { name: 'John', email: 'john@example.com' }
```

**Granular import (from subpath - recommended for production):**
```typescript
import { createStorage } from 'unstorage'
import { S3Client } from '@aws-sdk/client-s3'
import { awsS3Driver } from '@mtngtools/unstorage/drivers/aws-s3'

// Create storage instance
const storage = createStorage({
  driver: awsS3Driver({
    bucket: 'my-storage-bucket'
  })
})

// Use the storage
await storage.setItem('user:123', { name: 'John', email: 'john@example.com' })
const user = await storage.getItem('user:123')
console.log(user) // { name: 'John', email: 'john@example.com' }
```

Notes about recent driver changes:

- Prefer `storagePrefix` (driver option) for S3 prefixing; the driver still accepts the legacy `s3StoragePrefix` but canonicalizes it to `storagePrefix`.
- The driver validator computes and exposes `fullBasePrefix` (the joined `storagePrefix` + `base`) which the driver uses to build S3 keys. If you provide custom mapping functions, they now receive the validated options object as a second parameter so you can access `fullBasePrefix`.
- You can pass a pre-constructed `s3Client` to reuse a client instance, or omit it and provide inline `region`/`accessKeyId`/`secretAccessKey`/`sessionToken` — the driver will construct an S3 client for you when needed.

### AWS S3 Flex: custom key and value mapping

The flex variant lets you adapt keys and values to existing S3 layouts without forking the driver.

**Convenience import (from root):**
```ts
import { awsS3FlexDriver } from '@mtngtools/unstorage'
```

**Granular import (from subpath - recommended for production):**
```ts
import { awsS3FlexDriver } from '@mtngtools/unstorage/drivers/aws-s3'
```

Key mapping hooks allow you to translate between unstorage keys (':' separated) and S3 keys:

```ts
const storage = createStorage({
  driver: awsS3FlexDriver({
    s3Client,
    bucket: 'my-bucket',
    // Example: always store with .json suffix
    toStorageKey(key, opts) {
      return `${opts.fullBasePrefix ? opts.fullBasePrefix + '/' : ''}${key}.json`
    },
    fromStorageKey(s3Key, opts) {
      const withoutBase = opts.fullBasePrefix && s3Key.startsWith(opts.fullBasePrefix)
        ? s3Key.slice(opts.fullBasePrefix.length + 1)
        : s3Key
      return withoutBase.endsWith('.json') ? withoutBase.slice(0, -5) : withoutBase
    }
  })
})
```

Value mapping hooks let you transform raw strings read/written by the driver:

```ts
const storage = createStorage({
  driver: awsS3FlexDriver({
    s3Client,
    bucket: 'my-bucket',
    toStorageValue(value) {            // value is a string produced by unstorage serialization
      return value                     // transform if needed (e.g., compress, wrap, etc.)
    },
    fromStorageValue(value) {          // value is the raw string read from S3
      return JSON.parse(value)         // transform to your desired type
    }
  })
})
```

Type rules:
- Mapping hooks are optional; both can be omitted.
- If `fromStorageKey` is provided, either also provide `toStorageKey` or set `readOnly: true`.
- If `fromStorageValue` is provided, either also provide `toStorageValue` or set `readOnly: true`.

### AWS SSM Driver

AWS Systems Manager Parameter Store driver. Keys map to parameter paths (e.g. `/my-app/key1`).

```bash
pnpm install @mtngtools/unstorage @aws-sdk/client-ssm unstorage
```

**Convenience import (from root):**
```typescript
import { createStorage } from 'unstorage'
import { awsSsmDriver } from '@mtngtools/unstorage'

const storage = createStorage({
  driver: awsSsmDriver({
    region: 'us-east-1',
    storagePrefix: 'my-app',
  })
})
await storage.setItem('config:feature-x', 'true')
const value = await storage.getItem('config:feature-x')
```

**Granular import (from subpath - recommended for production):**
```typescript
import { awsSsmDriver } from '@mtngtools/unstorage/drivers/aws-ssm'
```

You can pass a pre-constructed `ssmClient` or omit it and provide `region` (and optionally credentials). Use `withDecryption: true` (default) to decrypt SecureString parameters when reading.

### AWS SSM Flex: custom key and value mapping

The flex variant adds custom key and value mapping for Parameter Store, similar to S3 Flex.

**Convenience import:** `import { awsSsmFlexDriver } from '@mtngtools/unstorage'`  
**Granular import:** `import { awsSsmFlexDriver } from '@mtngtools/unstorage/drivers/aws-ssm'`

See [AWS SSM Driver](./docs/drivers/aws-ssm.md#flex-driver-custom-mapping) for options and examples.

## Documentation

### Driver Documentation

- **[All Drivers Overview](./docs/drivers/README.md)** - Comparison and overview of all drivers
- **[AWS S3 Driver](./docs/drivers/aws-s3.md)** - Complete AWS S3 driver documentation
- **[AWS SSM Driver](./docs/drivers/aws-ssm.md)** - Complete AWS SSM Parameter Store driver documentation
- **[API Reference](./docs/api-reference.md)** - Package exports and types

### Agent guidance

- Organization-wide agent guidance: [`AGENTS_ORGANIZATION.md`](./AGENTS_ORGANIZATION.md)
- TypeScript-specific agent guidance: [`AGENTS_TYPESCRIPT.md`](./AGENTS_TYPESCRIPT.md)
- Repo-level agent guidance (minimal): [`AGENTS_REPO.md`](./AGENTS_REPO.md)
- Package-specific agent guidance: [`AGENTS.md`](./AGENTS.md)

## Testing

```bash
# Unit tests (standard)
pnpm test

# Additional modes
pnpm test:verbose      # Verbose reporter
pnpm test:min          # Dot/minimal reporter
pnpm test:ui           # Interactive UI mode
pnpm test:coverage     # Unit test coverage

# E2E tests (requires environment setup)
pnpm test:e2e
```

For E2E testing setup, see the specific driver documentation.

### E2E Setup (S3)
E2E tests are gated and require:
1. AWS credentials (CLI config, env vars, or credentials file)
2. A test S3 bucket
3. Environment config

Recommended (environment file):
```bash
cp .env.test.e2e .env.test.e2e.local
echo 'AWS_S3_E2E_ENABLED=true' >> .env.test.local
echo 'AWS_S3_TEST_BUCKET=your-bucket' >> .env.test.local
echo 'AWS_S3_TEST_PREFIX=your-test-prefix' >> .env.test.local
pnpm test:e2e
```

Or set variables directly:
```bash
export AWS_S3_E2E_ENABLED=true
export AWS_S3_TEST_BUCKET=your-bucket
export AWS_S3_TEST_PREFIX=test-mtng-unstorage-e2e/
# Optional if not in shared config
# export AWS_REGION=us-east-1
pnpm test:e2e
```

Environment file load order (highest wins):
- `.env.test.e2e.local`
- `.env.test.e2e`

Security:
- Never commit credentials
- Use a unique prefix (`AWS_S3_TEST_PREFIX`) to isolate and simplify cleanup

### E2E Setup (SSM)
E2E tests for the SSM driver are gated. Enable and configure via environment:

```bash
# In .env.test.e2e.local or env vars
AWS_SSM_E2E_ENABLED=true
AWS_SSM_TEST_PREFIX=/test/mtng-unstorage/e2e
# AWS_REGION=us-east-1  # optional, uses default config
```

Use a dedicated test prefix to isolate and simplify cleanup. AWS credentials follow the same chain as S3 (CLI config, env vars, IAM roles).

## License

MIT © [Jason Bulson](https://github.com/jbulson)

## Support

- 📝 [Issues](https://github.com/mtngtools/mtng-unstorage/issues)
- 💬 [Discussions](https://github.com/mtngtools/mtng-unstorage/discussions)
- 📖 [Documentation](./docs/)

## Related Projects

- [unstorage](https://github.com/unjs/unstorage)
- [AWS SDK for JavaScript](https://github.com/aws/aws-sdk-js-v3)