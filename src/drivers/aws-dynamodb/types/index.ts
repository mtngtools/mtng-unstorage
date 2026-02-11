/**
 * AWS DynamoDB driver types
 */

export type {
  AwsDynamoDBStrategy,
  SortKeyStrategy,
  PartitionKeyOnlyStrategy,
  SortKeyStrategyOptions,
  PartitionKeyOnlyStrategyOptions,
  AwsDynamoDBDriverOptions,
  AwsDynamoDBDriverTransactionOptions,
  ResolvedAwsDynamoDBStrategy,
  ResolvedAwsDynamoDBDriverOptions,
  ConditionalDriver,
} from './types-base.js';

export { AWS_DYNAMODB_DRIVER_NAME, isIndexStrategy, hasSortKey } from './types-base.js';
