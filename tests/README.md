# Test Suite Organization

This document describes the organization and structure of the test suite for `@mtngtools/unstorage`.

## Overview

The test suite is organized into a modular, hierarchical structure that supports:
- **Unit tests** - Testing individual functions and utilities in isolation
- **Integration tests** - Testing with mocked AWS clients
- **End-to-end (E2E) tests** - Testing with real AWS services

## Test Types

### Core Tests
Core tests use `testDriver()` from `unstorage` to verify standard driver behavior. These tests are driver-agnostic and ensure all drivers conform to the unstorage driver interface.

### MT Tests (Meeting Tool-specific)
MT tests verify runtime behavior specific to our implementation, including:
- Configuration validation
- Option handling
- Error handling
- Custom functionality

### TypeScript Type Tests
Type tests verify compile-time type checking and type inference. These tests are excluded from E2E runs since they only validate TypeScript types, not runtime behavior.

## Folder Structure

```
tests/
├── drivers/              # Driver-specific tests
│   └── aws-s3/
│       ├── aws-s3-base.test.ts          # Base driver MT tests
│       ├── aws-s3-base-types.test.ts    # Base driver type tests (integration only)
│       ├── aws-s3-flex.test.ts          # Flex driver MT tests
│       ├── aws-s3-flex-types.test.ts    # Flex driver type tests (integration only)
│       ├── aws-s3-compare.test.ts       # Comparison tests (integration only)
│       └── shared-*.test.ts             # Shared utility tests
│
├── variants/             # Variant-specific shared tests
│   ├── base/
│   │   ├── base-mt-tests.ts            # Base variant MT tests
│   │   └── base-mt-tests-types.ts      # Base variant type tests
│   ├── flex/
│   │   ├── flex-core-tests.ts           # Flex core tests (for testDriver)
│   │   ├── flex-mt-tests.ts             # Flex variant MT tests
│   │   └── flex-mt-tests-types.ts       # Flex variant type tests
│   └── versioned/
│       └── versioned-tests.ts           # Versioned variant tests
│
├── providers/            # Provider-specific shared tests
│   └── aws/
│       └── aws-provider-tests.ts        # AWS provider tests
│
├── utils/                # Utility function tests
│   ├── common-lib.test.ts              # Common library utilities
│   └── common-storage.test.ts           # Storage-specific utilities
│
├── helpers/              # Test helpers and utilities
│   ├── test-driver.ts                   # Wrapper for unstorage testDriver
│   ├── test-utils.ts                   # Conditional test execution helpers
│   └── mock-s3.ts                       # Mock S3 client
│
├── integration/          # Integration test entry points
│   ├── drivers-core.test.ts             # Core tests entry point
│   └── drivers-mt.test.ts              # MT tests entry point
│
└── e2e/                  # E2E test entry points
    ├── drivers-core.test.ts             # Core tests entry point
    └── drivers-mt.test.ts               # MT tests entry point (excludes type/compare/utils tests)
```

## Entry Points

### Integration Tests
Integration tests run with mocked AWS clients and include all test types:

- **`tests/integration/drivers-core.test.ts`** - Runs core tests via `testDriver()` for all drivers and variants
- **`tests/integration/drivers-mt.test.ts`** - Imports all driver-specific MT tests, type tests, comparison tests, and utility tests

### E2E Tests
E2E tests run against real AWS services and exclude tests that don't make sense in E2E context:

- **`tests/e2e/drivers-core.test.ts`** - Runs core tests via `testDriver()` for all drivers and variants (same as integration)
- **`tests/e2e/drivers-mt.test.ts`** - Imports only driver-specific MT tests (excludes type tests, comparison tests, and utility tests)

## Test Execution Modes

Tests are executed in different modes based on the `VITEST_MODE` environment variable:

- **Integration mode** (`VITEST_MODE !== 'e2e'`) - Uses mocked clients
- **E2E mode** (`VITEST_MODE === 'e2e'`) - Uses real AWS services

### Conditional Test Execution

Use helper functions to conditionally skip tests in E2E mode:

```typescript
import { itSkipInE2E, describeSkipInE2E } from '../helpers/test-utils.js'

// Skip a single test in E2E
itSkipInE2E('validates bucket is required', () => {
  // This test only runs in integration mode
})

// Skip an entire describe block in E2E
describeSkipInE2E('mock-specific behavior', () => {
  // These tests only run in integration mode
})
```

## Test File Naming Conventions

- **`*-base.test.ts`** - Base driver MT tests
- **`*-flex.test.ts`** - Flex driver MT tests
- **`*-versioned.test.ts`** - Versioned driver MT tests
- **`*-base-types.test.ts`** - Base driver TypeScript type tests (integration only)
- **`*-flex-types.test.ts`** - Flex driver TypeScript type tests (integration only)
- **`*-compare.test.ts`** - Driver comparison tests (integration only)
- **`shared-*.test.ts`** - Shared utility tests (integration only)

## Adding New Tests

### Adding a New Driver

1. **Create driver test files** in `tests/drivers/{driver-name}/`:
   - `{driver-name}-base.test.ts` - Base driver MT tests
   - `{driver-name}-flex.test.ts` - Flex driver MT tests (if applicable)
   - `{driver-name}-base-types.test.ts` - Type tests (integration only)
   - `{driver-name}-flex-types.test.ts` - Type tests (integration only)

2. **Add driver to core tests** in `tests/integration/drivers-core.test.ts`:
   ```typescript
   {
     name: 'aws-dynamodb',
     base: awsDynamodbDriver,
     flex: awsDynamodbFlexDriver,
     versioned: awsDynamodbVersionedDriver,
     makeMockClient: () => new MockDynamodbClient(),
     getDefaultOptions: () => ({ table: 'test-table', allowClear: true }),
   }
   ```

3. **Import MT tests** in `tests/integration/drivers-mt.test.ts`:
   ```typescript
   import '../drivers/aws-dynamodb/aws-dynamodb-base.test.js'
   import '../drivers/aws-dynamodb/aws-dynamodb-flex.test.js'
   ```

4. **Import MT tests** in `tests/e2e/drivers-mt.test.ts` (exclude type tests):
   ```typescript
   import '../drivers/aws-dynamodb/aws-dynamodb-base.test.js'
   import '../drivers/aws-dynamodb/aws-dynamodb-flex.test.js'
   ```

### Adding Variant Tests

1. **Core tests** (for `testDriver` `additionalTests`):
   - Create `tests/variants/{variant-name}/{variant-name}-core-tests.ts`
   - Export a function that takes `ctx` from `testDriver`
   - Import in `tests/integration/drivers-core.test.ts` and `tests/e2e/drivers-core.test.ts`

2. **MT tests** (runtime behavior):
   - Create `tests/variants/{variant-name}/{variant-name}-mt-tests.ts`
   - Import in driver-specific test files

3. **Type tests** (TypeScript type checking):
   - Create `tests/variants/{variant-name}/{variant-name}-mt-tests-types.ts`
   - Import in driver-specific type test files

### Adding Provider Tests

1. Create `tests/providers/{provider-name}/{provider-name}-provider-tests.ts`
2. Import in driver-specific test files that use that provider

## Running Tests

### Integration Tests (with mocks)
```bash
pnpm test
# or
pnpm test:integration
```

### E2E Tests (with real AWS)
```bash
pnpm test:e2e
```

### Specific Test File
```bash
pnpm test tests/drivers/aws-s3/aws-s3-base.test.ts
```

## Test Organization Principles

1. **Separation of Concerns**
   - Core tests mirror the tests in `testDriver()` from the unstorage repository - they verify standard driver behavior
   - MT tests are anything else we want to test - implementation-specific behavior, configuration validation, error handling, etc.
   - Type tests verify compile-time type safety

2. **Reusability**
   - Variant tests are shared across all drivers that support that variant
   - Provider tests are shared across all drivers that use that provider
   - Driver tests are specific to each driver implementation

3. **Conditional Execution**
   - E2E tests only include certain test files: driver-specific MT tests (excluding type tests, comparison tests, and utility tests)
   - Within a common test file that runs in both integration and E2E, use `itSkipInE2E` and `describeSkipInE2E` to skip individual tests that should only run with mocks

4. **Scalability**
   - Structure supports adding new drivers, variants, and providers
   - Entry points make it easy to add new tests without modifying core infrastructure

## Future Drivers

The test structure is designed to easily accommodate future drivers:
- AWS DynamoDB
- AWS Systems Manager Parameter Store
- Additional AWS services

When adding new drivers, follow the same patterns established for the S3 driver.

