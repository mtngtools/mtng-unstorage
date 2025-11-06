# @mtngtools/unstorage

A TypeScript library providing storage drivers for [unstorage](https://github.com/unjs/unstorage) with support for various cloud storage backends, designed to extend the capabilities of unstorage with drivers not currently built in.

[![npm version](https://badge.fury.io/js/@mtngtools%2Funstorage.svg)](https://badge.fury.io/js/@mtngtools%2Funstorage)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

### Current Drivers

- **[AWS S3 Driver](./docs/drivers/aws-s3.md)** - AWS S3 storage using the [AWS SDK for JavaScript](https://github.com/aws/aws-sdk-js-v3) rather than the HTTP api currently built-in to unstorage. 

### Planned Drivers

- **[AWS DynamoDB Driver]** 
- **[AWS Systems Manager Parameter Store]** 

### Planned Driver Features

- **Custom key mapping** - Driver option providing custom mapping of unstorage key to/from storage key
- **Custom value mapping** - Driver option providing custom mapping of unstorage key to/from storage value
- **Auto-versioned writes** - Store as current value, but also with copy as timestamped version (not to be overwritten)
- **Load version** - Load prior version instead of current value

## Features

- 🚀 **TypeScript First**: Built with TypeScript for better developer experience
- 🔧 **Additional Features**: Read-only mode, default clear protection, maxDepth filtering
- 🧪 **Tested**: Unit and E2E tests
- 📦 **Tree Shakeable**: ESM and CJS builds with proper tree shaking
- 🔒 **Type Safe**: Full TypeScript support with detailed type definitions

## Quick Start

### Installation

```bash
pnpm install @mtngtools/unstorage
```

### AWS S3 Driver

```bash
# Install required peer dependencies for S3
pnpm install @aws-sdk/client-s3 unstorage
```

```typescript
import { createStorage } from 'unstorage'
import { S3Client } from '@aws-sdk/client-s3'
import { awsS3Driver } from '@mtngtools/unstorage'

// Create S3 client (add region and credentials if not available from environment)
const s3Client = new S3Client({})

// Create storage instance
const storage = createStorage({
  driver: awsS3Driver({
    s3Client,
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

## Documentation

### Driver Documentation

- **[All Drivers Overview](./docs/drivers/README.md)** - Comparison and overview of all drivers
- **[AWS S3 Driver](./docs/drivers/aws-s3.md)** - Complete AWS S3 driver documentation

### Agent guidance

- Organization-wide agent guidance: [`AGENTS_ORGANIZATION.md`](./AGENTS_ORGANIZATION.md)
- TypeScript-specific agent guidance: [`AGENTS_TYPESCRIPT.md`](./AGENTS_TYPESCRIPT.md)
- Repo-level agent guidance (minimal): [`AGENTS_REPO.md`](./AGENTS_REPO.md)
- Package-specific agent guidance: [`AGENTS.md`](./AGENTS.md)

## Testing

```bash
# Unit tests only
pnpm test

# E2E tests (requires environment setup)
pnpm run test:e2e

# All tests with coverage
pnpm run test:coverage
```

For E2E testing setup, see the specific driver documentation.

## API Reference

# @mtngtools/unstorage

A TypeScript library providing storage drivers for [unstorage](https://github.com/unjs/unstorage). These drivers extend unstorage with implementations (like AWS S3 via the official SDK) and planned advanced features around key/value mapping and versioning.

[![npm version](https://badge.fury.io/js/@mtngtools%2Funstorage.svg)](https://badge.fury.io/js/@mtngtools%2Funstorage)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Drivers

### Current
- **[AWS S3 Driver](./docs/drivers/aws-s3.md)** – Uses the AWS SDK v3 instead of the HTTP API built into unstorage.

### Planned
- AWS DynamoDB Driver
- AWS Systems Manager Parameter Store Driver

### Planned Driver Features
- Custom key mapping (to/from storage key)
- Custom value mapping (to/from storage value)
- Auto-versioned writes (retain timestamped immutable copies)
- Load prior version by timestamp

## Features

- 🚀 **TypeScript First** – Rich types & helper utilities
- 🔧 **Extra Capabilities** – Read-only mode, clear protection, maxDepth filtering
- 🧪 **Tested** – Unit + (gated) E2E suites
- 📦 **Tree‑shakeable** – Published as ESM + CJS with type declarations
- 🔒 **Type Safe** – Strict option validation & exported types

## Installation

```bash
pnpm install @mtngtools/unstorage
```

Peer deps for S3:

```bash
pnpm install @aws-sdk/client-s3 unstorage
```

## Quick Start (AWS S3)

```typescript
import { createStorage } from 'unstorage'
import { S3Client } from '@aws-sdk/client-s3'
import { awsS3Driver } from '@mtngtools/unstorage'

const s3Client = new S3Client({}) // add region/credentials if not via env

const storage = createStorage({
   driver: awsS3Driver({
      s3Client,
      bucket: 'my-storage-bucket'
   })
})

await storage.setItem('user:123', { name: 'John', email: 'john@example.com' })
const user = await storage.getItem('user:123')
console.log(user)
```

### Recent Driver Notes
- Prefer `storagePrefix`; legacy `s3StoragePrefix` is still accepted then canonicalized.
- Validator exposes `fullBasePrefix` (joined `storagePrefix` + `base`). Custom mappers receive validated options so you can use it.
- Provide an existing S3 client or let the driver construct one with inline credentials (`region`, `accessKeyId`, `secretAccessKey`, optional `sessionToken`).

## Documentation

- **[All Drivers Overview](./docs/drivers/README.md)**
- **[AWS S3 Driver](./docs/drivers/aws-s3.md)**
- **[API Reference](./docs/api-reference.md)**

### Agent Guidance
- Organization: [`AGENTS_ORGANIZATION.md`](./AGENTS_ORGANIZATION.md)
- TypeScript: [`AGENTS_TYPESCRIPT.md`](./AGENTS_TYPESCRIPT.md)
- Repo-level: [`AGENTS_REPO.md`](./AGENTS_REPO.md)
- Package-specific: [`AGENTS.md`](./AGENTS.md)

## Testing

Core scripts:
```bash
pnpm test              # Unit tests
pnpm test:verbose      # Verbose reporter
pnpm test:min          # Dot/minimal reporter
pnpm test:ui           # Interactive UI mode
pnpm test:coverage     # Unit test coverage
pnpm test:e2e          # E2E tests (requires env setup)
```

### E2E Setup (S3)
E2E tests are gated and require:
1. AWS credentials (CLI config, env vars, or credentials file)
2. A test S3 bucket
3. Environment config

Recommended (environment file):
```bash
cp .env.test .env.test.local
echo 'AWS_S3_E2E_ENABLED=true' >> .env.test.local
echo 'AWS_S3_TEST_BUCKET=your-bucket' >> .env.test.local
echo 'AWS_S3_TEST_PREFIX=test-$(whoami)-' >> .env.test.local
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
- `.env.test.local`
- `.env.test`

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