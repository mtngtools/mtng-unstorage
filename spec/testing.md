# Testing Strategy

## Overview
Testing ensures reliability and correctness across drivers, especially when interacting with external services like AWS S3.

## Frameworks
- **Test Runner**: [Vitest](https://vitest.dev/)
- **Linting**: [Oxlint](https://oxc-project.github.io/docs/guide/usage/linter.html)

## Test Types

### 1. Unit Tests (`tests/**/*.test.ts`)
- **Scope**: Individual functions and utilities.
- **Focus**: Logic verification, edge cases, and mocked interactions.
- **Command**: `pnpm test`

### 2. Integration / E2E Tests (`tests/**/*.e2e.test.ts`)
- **Scope**: Full driver workflows against real services (or high-fidelity mocks like LocalStack).
- **Focus**: Verify S3 connectivity, permission handling, and data integrity.
- **Configuration**: `vitest.e2e.config.ts`
- **Command**: `pnpm run test:e2e`

## Testing Patterns

We follow a consistent pattern for both **Integration** and **E2E** test suites to ensure both standard compliance and custom feature verification.

### 1. Core Compliance Tests (`drivers-core`)
These tests mirror the standard test suite from `unjs/unstorage`.
- **Purpose**: Ensure our drivers behave exactly like standard unstorage drivers.
- **Scope**: Basic `setItem`, `getItem`, `removeItem`, `getKeys`.
- **Runner**: `tests/integration/drivers-core.test.ts`
- **Mechanism**: Drivers are registered in the runner via `DriverTestConfigWithOptions`, which defines the driver factory, mock client configuration, and optional additional scenarios (see `tests/drivers/`).

### 2. mtngTOOLS Specific Tests (`drivers-mt`)
These tests cover features unique to `mtng-unstorage` that go beyond the standard spec.
- **Purpose**: Verify advanced functionality like Flex drivers, custom mapping, and versioning.
- **Scope**: Flex driver configuration, key/value mapping, conditional methods (`readOnly`).
- **File Pattern**: `tests/**/drivers-mt.test.ts`

### 3. Provider Tests
Shared logic for setting up test environments (e.g., temporary S3 buckets or mocked clients) is centralized in `tests/providers/`.

### 4. Core compliance for aws-ddb (`drivers-core-aws-ddb`)
The **aws-ddb** driver uses a dedicated integration file and runner so that the same variant contract as `drivers-core` (base, flex, versioned) is applied **per scenario** instead of once per driver.

- **Meaning of “base” for aws-ddb**: Running aws-ddb “base” means **running the driver in 8 scenarios**, not a single driver instance. Each scenario is a combination of strategy and partition-key resolution path (see [drivers/aws-ddb/README.md](drivers/aws-ddb/README.md) § Testing Considerations).

## E2E Test Configuration

E2E tests require specific environment variables to run against real AWS services. These can be set in a `.env.test.e2e.local` file (mirrored from `.env.test.e2e`).

| Variable | Description | Default |
| :--- | :--- | :--- |
| `AWS_S3_E2E_ENABLED` | Set to `true` to run S3 E2E tests. | `false` |
| `AWS_SSM_E2E_ENABLED` | Set to `true` to run SSM E2E tests. | `false` |
| `AWS_DDB_E2E_ENABLED` | Set to `true` to run DynamoDB E2E tests. | `false` |
| `AWS_S3_TEST_BUCKET` | Name of the S3 bucket to use for testing. | - |
| `AWS_S3_TEST_PREFIX` | Key prefix for test isolation. | `test-mtng-unstorage-e2e-` |
| `AWS_SSM_TEST_PREFIX` | Key prefix (path) for test isolation. | `/test/mtng-unstorage/e2e` |
| `AWS_DDB_TABLE_PK_SK` | DynamoDB table with PK+SK (for strategies 2, 3, 5). | - |
| `AWS_DDB_TABLE_PK` | DynamoDB table with PK only (for strategies 1, 4). | - |
| `AWS_DDB_LSI_INDEX_NAME` | LSI name on PK+SK table. | - |
| `AWS_DDB_GSI_Index_NAME` | GSI name on PK+SK or PK-only table (see driver spec). | - |
| `AWS_DDB_PROPAGATION_DELAY` | Ms to wait for GSI propagation in E2E. | `1000` |
| `AWS_REGION` | AWS Region to use. | System default |

**Note**: Standard AWS credentials (`AWS_ACCESS_KEY_ID`, etc.) must also be available via environment variables or local configuration files.

## Continuous Integration
Tests are run automatically on PRs via GitHub Actions to ensure no regressions.