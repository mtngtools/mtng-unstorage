/**
 * AWS DynamoDB driver types
 */

export type {
  AWSDDbStrategy,
  SortKeyStrategy,
  PartitionKeyOnlyStrategy,
  SortKeyStrategyOptions,
  PartitionKeyOnlyStrategyOptions,
  AWSDDbDriverOptions,
  MTDdbDriverTransactionOptions,
  ResolvedAWSDDbStrategy,
  ResolvedAWSDDbDriverOptions,
  ConditionalDriver,
} from './types-base.js';

export { AWS_DDB_DRIVER_NAME, isIndexStrategy, hasSortKey } from './types-base.js';
