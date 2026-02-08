# AWS SSM Parameter Store Driver

An AWS Systems Manager Parameter Store driver for unstorage using the official AWS SDK for JavaScript v3.

## Features

- **AWS SDK Integration**: Uses official AWS SDK v3 for maximum compatibility
- **Support for native credentials**: Does not require AWS credentials to instantiate if SSMClient finds them in the runtime environment
- **withDecryption**: Optional decryption of SecureString parameters when reading (default: `true`), overridable per request
- **MaxDepth Support**: Native support for filtering keys by depth
- **Read-Only Mode**: Configurable read-only mode to prevent write operations
- **Clear Protection**: Explicit opt-in required for clear operations; requires non-empty prefix to prevent accidental deletion of all parameters

> Flex variant: A flex variant adds custom key and value mapping hooks. See [Flex driver: custom mapping](#flex-driver-custom-mapping).

## Installation

```bash
pnpm install @mtngtools/unstorage @aws-sdk/client-ssm unstorage
```

## Basic Usage

```typescript
import { createStorage } from 'unstorage'
import { awsSsmDriver } from '@mtngtools/unstorage'

const storage = createStorage({
  driver: awsSsmDriver({
    region: 'us-east-1',
    storagePrefix: 'my-app',
    // Optional: withDecryption: true (default),
    // Optional: pass ssmClient to reuse a shared client
  })
})

await storage.setItem('config:feature-x', 'true')
const value = await storage.getItem('config:feature-x')
await storage.removeItem('config:feature-x')
const keys = await storage.getKeys()
```

### Using a shared SSM client

Pass a pre-constructed `SSMClient` to reuse a single client instance:

```typescript
import { createStorage } from 'unstorage'
import { SSMClient } from '@aws-sdk/client-ssm'
import { awsSsmDriver } from '@mtngtools/unstorage'

const ssmClient = new SSMClient({ region: 'us-east-1' })

const storage = createStorage({
  driver: awsSsmDriver({ ssmClient, region: 'us-east-1', storagePrefix: 'my-app' })
})
```

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|--------|-------------|
| `region` | `string` | **Yes** | — | AWS region (e.g. `us-east-1`). |
| `ssmClient` | `SSMClient` | No | — | Pre-configured AWS SDK v3 client. When provided, inline credentials are ignored. |
| `storagePrefix` | `string` | No | — | Prefix for all parameter paths (e.g. `/my-app`). Recommended to isolate app data. |
| `base` | `string` | No | — | Additional base path (driver-agnostic). Combined with `storagePrefix` for the full path prefix. |
| `withDecryption` | `boolean` | No | `true` | When `true`, decrypt SecureString parameters on GetParameter / GetParametersByPath. Can be overridden per request. |
| `name` | `string` | No | `'aws-ssm'` | Driver name for debugging. |
| `readOnly` | `boolean` | No | `false` | When `true`, only read operations are allowed. |
| `allowClear` | `boolean` | No | `false` | When `true`, allows `clear`. Requires a non-empty prefix; cannot clear root `/`. |

Inline credentials (`accessKeyId`, `secretAccessKey`, `sessionToken`) are optional; when omitted, the AWS SDK default credential provider chain is used.

### Key mapping

- Unstorage keys (e.g. `config:feature-x`) are mapped to SSM parameter names (e.g. `/my-app/config/feature-x`).
- The driver builds the full parameter path from `storagePrefix` and `base` plus the key.

### Request options

Read operations accept an optional options object. The SSM driver supports:

- **`withDecryption`** (`boolean`, optional): Override the driver-level `withDecryption` for this request only.

## Additional Features

### Read-Only Mode

```typescript
const storage = createStorage({
  driver: awsSsmDriver({
    region: 'us-east-1',
    storagePrefix: 'my-app',
    readOnly: true
  })
})

await storage.getItem('key')   // OK
await storage.setItem('key', 'v')  // Error: driver is in read-only mode
```

### Clear Protection

Clear is only allowed when `allowClear: true` and the effective prefix is non-empty (so you cannot clear the root path and delete all account parameters).

```typescript
const storage = createStorage({
  driver: awsSsmDriver({
    region: 'us-east-1',
    storagePrefix: 'my-app',
    allowClear: true
  })
})

await storage.clear()  // Deletes all parameters under the configured prefix
```

### maxDepth Support

Filter keys by depth (colon-separated segments):

```typescript
const keys = await storage.getKeys('', { maxDepth: 2 })
```

## Flex driver: custom mapping

The flex driver (`awsSsmFlexDriver`) supports custom key and value mapping so you can adapt to existing parameter naming or value formats without forking the driver.

**Convenience import:** `import { awsSsmFlexDriver } from '@mtngtools/unstorage'`  
**Granular import:** `import { awsSsmFlexDriver } from '@mtngtools/unstorage/drivers/aws-ssm'`

### Key mapping

Map between unstorage keys and SSM parameter names:

```typescript
const storage = createStorage({
  driver: awsSsmFlexDriver({
    region: 'us-east-1',
    storagePrefix: 'my-app',
    toStorageKey(key, opts) {
      return `${opts.fullBasePrefix ?? ''}/${key.replace(/:/g, '/')}`
    },
    fromStorageKey(paramName, opts) {
      const base = opts.fullBasePrefix ?? ''
      const withoutBase = base && paramName.startsWith(base)
        ? paramName.slice(base.length + 1)
        : paramName
      return withoutBase.replace(/\//g, ':')
    }
  })
})
```

### Value mapping

Transform values when reading or writing:

```typescript
const storage = createStorage({
  driver: awsSsmFlexDriver({
    region: 'us-east-1',
    storagePrefix: 'my-app',
    toStorageValue(params) {
      return JSON.stringify(params.input)
    },
    fromStorageValue(value) {
      return JSON.parse(value)
    }
  })
})
```

### Type rules

- Mapping hooks are optional.
- If `fromStorageKey` is provided, either provide `toStorageKey` or set `readOnly: true`.
- If `fromStorageValue` is provided, either provide `toStorageValue` or set `readOnly: true`.
