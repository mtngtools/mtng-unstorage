# Flex Types Specification

## Overview
Flex types support advanced drivers (such as `awsS3FlexDriver`) that require custom key and value serialization logic.

**Source**: `src/types/driver-flex.ts`

## Key Mapping

Flex drivers support `toStorageKey` and `fromStorageKey` mapping functions.

- **`toStorageKey`**: Transform a standard key (e.g., `user:123`) to a storage-specific key (e.g., `users/123.json`).
- **`fromStorageKey`**: Reverse map a storage key (e.g., `users/123.json`) back to a standard key (e.g., `user:123`).

### Mapping Function Signature

```typescript
type KeyMapper = (params: {
  key: string;
  resolvedDriverOptions: ResolvedDriverOptions;
  transactionOptions?: TransactionOptions;
}) => string;
```

Key mapping functions receive the full driver configuration context, allowing dynamic prefixing or environment-specific rules.

## Value Mapping

Flex drivers support `toStorageValue` and `fromStorageValue` mapping functions for handling serialization.

- **`toStorageValue`**: Convert a JavaScript object/value to a storage-compatible string (e.g., `JSON.stringify`).
- **`fromStorageValue`**: Convert a storage string back to a JavaScript object/value (e.g., `JSON.parse`).

### Mapping Function Signature

```typescript
type ValueMapper<TInput, TOutput> = (params: {
  input: TInput;
  resolvedDriverOptions: ResolvedDriverOptions;
  transactionOptions?: TransactionOptions;
}) => TOutput | Promise<TOutput>;
```

Value mappers can be async, allowing for complex transformations like compression or encryption.

## Configuration Rules

TypeScript ensures safe configuration:
- If `toStorageKey` is provided, `fromStorageKey` is required (unless `readOnly: true`).
- If `toStorageValue` is provided, `fromStorageValue` is required (unless `readOnly: true`).
