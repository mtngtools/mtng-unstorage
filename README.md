# @mtngtools/unstorage

A TypeScript library providing storage drivers for [unstorage](https://github.com/unjs/unstorage) with support for various cloud storage backends, designed to extend the capabilities of unstorage with drivers not currently built in.

[![npm version](https://badge.fury.io/js/@mtngtools%2Funstorage.svg)](https://badge.fury.io/js/@mtngtools%2Funstorage)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

### Current Drivers

- **[AWS S3 Driver](./docs/drivers/aws-s3.md)** – AWS S3 storage using the [AWS SDK for JavaScript](https://github.com/aws/aws-sdk-js-v3).
- **[AWS S3 Flex Driver](./docs/drivers/aws-s3.md#flex-driver-custom-mapping)** – Adds custom key and value mapping hooks on top of the S3 driver.

### Planned Drivers

- AWS DynamoDB Driver
- AWS Systems Manager Parameter Store

### Planned Driver Features

- **Auto-versioned writes** - Store as current value, but also with copy as timestamped version (not to be overwritten)
- **Load version** - Load prior version instead of current value

## Features

- **TypeScript First**: Built with TypeScript for better developer experience
- **Additional Features**: Read-only mode, default clear protection, maxDepth filtering
- **Tested**: Unit and E2E tests
- **Tree Shakeable**: ESM and CJS builds with proper tree shaking
- **Type Safe**: Full TypeScript support with detailed type definitions

## Quick Start

### Installation

```bash
pnpm install @mtngtools/unstorage
```

### AWS S3 Driver

```bash
# Install required peer dependencies for S3 and unstorage if not already installed
pnpm install @aws-sdk/client-s3 unstorage
```

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

Notes about recent driver changes:

- Prefer `storagePrefix` (driver option) for S3 prefixing; the driver still accepts the legacy `s3StoragePrefix` but canonicalizes it to `storagePrefix`.
- The driver validator computes and exposes `fullBasePrefix` (the joined `storagePrefix` + `base`) which the driver uses to build S3 keys. If you provide custom mapping functions, they now receive the validated options object as a second parameter so you can access `fullBasePrefix`.
- You can pass a pre-constructed `s3Client` to reuse a client instance, or omit it and provide inline `region`/`accessKeyId`/`secretAccessKey`/`sessionToken` — the driver will construct an S3 client for you when needed.

### AWS S3 Flex: custom key and value mapping

The flex variant lets you adapt keys and values to existing S3 layouts without forking the driver.

Import the flex driver via subpath export:

```ts
import awsS3FlexDriver from '@mtngtools/unstorage/aws-s3-flex'
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
- Provide both `toStorageKey` and `fromStorageKey` together (or neither). Exception: if `readOnly: true`, `fromStorageKey` may be omitted.
- Provide both `toStorageValue` and `fromStorageValue` together (or neither). Exception: if `readOnly: true`, `fromStorageValue` may be omitted.

## Documentation

### Driver Documentation

- **[All Drivers Overview](./docs/drivers/README.md)** - Comparison and overview of all drivers
- **[AWS S3 Driver](./docs/drivers/aws-s3.md)** - Complete AWS S3 driver documentation
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

## License

MIT © [Jason Bulson](https://github.com/jbulson)

## Support

- 📝 [Issues](https://github.com/mtngtools/mtng-unstorage/issues)
- 💬 [Discussions](https://github.com/mtngtools/mtng-unstorage/discussions)
- 📖 [Documentation](./docs/)

## Related Projects

- [unstorage](https://github.com/unjs/unstorage)
- [AWS SDK for JavaScript](https://github.com/aws/aws-sdk-js-v3)