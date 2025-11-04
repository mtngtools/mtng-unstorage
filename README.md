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

For detailed API documentation, see [API Reference](./docs/api-reference.md).

## License

MIT © [Jason Bulson](https://github.com/jbulson)

## Support

- 📝 [Issues](https://github.com/mtngtools/mtng-unstorage/issues)
- 💬 [Discussions](https://github.com/mtngtools/mtng-unstorage/discussions)
- 📖 [Documentation](./docs/)

## Related Projects

- [unstorage](https://github.com/unjs/unstorage) - Universal Storage Layer
- [AWS SDK for JavaScript](https://github.com/aws/aws-sdk-js-v3)

## Testing

### Running Tests

```bash
# Unit tests only
pnpm test

# Unit tests (explicit command)
pnpm run test:unit

# E2E tests (using environment files - recommended)
pnpm run test:e2e

# E2E tests (using environment variables)
AWS_S3_E2E_ENABLED=true AWS_S3_TEST_BUCKET=test-bucket AWS_S3_TEST_PREFIX=test-prefix/ pnpm run test:e2e

# With coverage
pnpm run test:coverage
```

### E2E Test Setup

To run E2E tests, you need:

1. **AWS credentials configured** (via AWS CLI, credentials file, or environment variables)
2. **An S3 bucket for testing**
3. **Environment configuration** (choose one of the options below)

#### Option 1: Environment File (Recommended)

1. Copy the template:
   ```bash
   cp .env.test .env.test.local
   ```

2. Configure your local settings in `.env.test.local`:
   ```bash
   AWS_S3_E2E_ENABLED=true
   AWS_S3_TEST_BUCKET=your-actual-test-bucket
   AWS_S3_TEST_PREFIX=test-$(whoami)-
   ```

3. Run tests:
   ```bash
   pnpm run test:e2e
   ```

#### Option 2: Environment Variables

Set environment variables directly:

```bash
export AWS_S3_E2E_ENABLED=true
export AWS_S3_TEST_BUCKET=your-test-bucket
export AWS_S3_TEST_PREFIX=test-mtng-unstorage-e2e/
# Optional: AWS_REGION (if not configured in AWS credentials/config)
# export AWS_REGION=us-east-1
```

#### Environment File Priority

Vite loads environment files in this order (higher priority overrides lower):
- `.env.test.local` (git-ignored, your personal settings)
- `.env.test` (committed, safe defaults for the team)

**Security Note:** 
- Never commit AWS credentials to `.env.test`
- Use `.env.test.local` for your personal configuration
- The `AWS_S3_TEST_PREFIX` helps isolate test data and makes cleanup easier

## License

MIT © [Jason Bulson](https://github.com/jbulson)

## Support

- 📝 [Issues](https://github.com/mtngtools/mtng-unstorage/issues)
- 💬 [Discussions](https://github.com/mtngtools/mtng-unstorage/discussions)

## Related Projects

- [unstorage](https://github.com/unjs/unstorage) - Universal Storage Layer
- [AWS SDK for JavaScript](https://github.com/aws/aws-sdk-js-v3)