/**
 * Base AWS DynamoDB driver types
 *
 * Discriminated union by strategy. Index strategies (lsi, gsi_pk, gsi_pk_sk)
 * are read-only; resolved options set readOnly to true for those strategies.
 */

import type {
  AwsRegionAndCredentials,
  Prettify,
  MTBaseDriverOptions,
  MTBaseDriverTransactionOptions,
  ResolvedMTBaseDriverOptions,
} from '../../../types/index.js';

/** Strategies that use a sort key (key = SK, PK from partitionKeyValue only: driver or transaction) */
export type SortKeyStrategy = 'table_pk_sk' | 'lsi' | 'gsi_pk_sk';
/** Strategies that use partition key only (key = PK with storagePrefix + base + requested key, same as aws-s3) */
export type PartitionKeyOnlyStrategy = 'table_pk' | 'gsi_pk';
export type AWSDDbStrategy = SortKeyStrategy | PartitionKeyOnlyStrategy;

const INDEX_STRATEGIES: readonly AWSDDbStrategy[] = ['lsi', 'gsi_pk', 'gsi_pk_sk'];
export function isIndexStrategy(s: AWSDDbStrategy): boolean {
  return (INDEX_STRATEGIES as readonly string[]).includes(s);
}

export function hasSortKey(s: AWSDDbStrategy): s is SortKeyStrategy {
  return s === 'table_pk_sk' || s === 'lsi' || s === 'gsi_pk_sk';
}

/** Common options for strategies that have a sort key */
export type SortKeyStrategyOptionsBase = {
  tableName: string;
  partitionKeyValue?: string;
  partitionKeyName?: string;
  sortKeyName?: string;
  valueAttributeName?: string;
  returnFullObject?: boolean;
  consistentRead?: boolean;
};

export type SortKeyStrategyOptions = SortKeyStrategyOptionsBase &
  (
    | { strategy?: 'table_pk_sk' }
    | { strategy: 'lsi'; indexName: string }
    | { strategy: 'gsi_pk_sk'; indexName: string }
  );

/** Common options for partition-key-only strategies */
export type PartitionKeyOnlyStrategyOptionsBase = {
  tableName: string;
  partitionKeyName?: string;
  valueAttributeName?: string;
  returnFullObject?: boolean;
  consistentRead?: boolean;
};

export type PartitionKeyOnlyStrategyOptions = PartitionKeyOnlyStrategyOptionsBase &
  (
    | { strategy: 'table_pk' }
    | { strategy: 'gsi_pk'; indexName: string }
  );

/** User-facing driver options (discriminated union) */
export type AWSDDbDriverOptions = Prettify<
  MTBaseDriverOptions &
    AwsRegionAndCredentials & {
      dynamoDbClient?: import('@aws-sdk/client-dynamodb').DynamoDBClient;
      /** Optional document client (e.g. for testing). When set, used instead of creating one from dynamoDbClient. */
      docClient?: import('@aws-sdk/lib-dynamodb').DynamoDBDocumentClient;
    } &
    (SortKeyStrategyOptions | PartitionKeyOnlyStrategyOptions)
>;

export type PartialAWSDDbDriverOptions = Partial<AWSDDbDriverOptions>;

/** Transaction options for DDB operations */
export type MTDdbDriverTransactionOptions = MTBaseDriverTransactionOptions & {
  partitionKeyValue?: string;
  consistentRead?: boolean;
  /** When true and getItems is called with a single key, use Query with begins_with to return all items whose key starts with that prefix. Default false. */
  returnStartsWithKey?: boolean;
};

export type PartialMTDdbDriverTransactionOptions = Partial<MTDdbDriverTransactionOptions>;

/** Resolved strategy (default table_pk_sk when omitted) */
export type ResolvedAWSDDbStrategy = SortKeyStrategy | PartitionKeyOnlyStrategy;

/** Resolved options with strategy-specific defaults (key names, etc.) applied */
export type ResolvedAWSDDbDriverOptions = Prettify<
  ResolvedMTBaseDriverOptions &
    AwsRegionAndCredentials & {
      dynamoDbClient: import('@aws-sdk/client-dynamodb').DynamoDBClient;
      docClient: import('@aws-sdk/lib-dynamodb').DynamoDBDocumentClient;
      strategy: ResolvedAWSDDbStrategy;
      tableName: string;
      partitionKeyName: string;
      sortKeyName?: string;
      valueAttributeName: string;
      returnFullObject: boolean;
      consistentRead: boolean;
      indexName?: string;
      fullBasePrefix: string;
      partitionKeyValue?: string;
    }
>;

export const AWS_DDB_DRIVER_NAME = 'aws-ddb' as const;

export type { ConditionalDriver } from '../../../types/index.js';
