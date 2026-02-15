/**
 * AWS DynamoDB driver public utilities
 *
 * Validation, client creation, and key mapping for the base driver.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { validateKey, validateBaseDriverOptions, validateAWSRegionAndCredentials } from '../../utils.js';
import type {
  AwsDynamoDBDriverOptions,
  ResolvedAwsDynamoDBDriverOptions,
  ResolvedAwsDynamoDBStrategy,
  AwsDynamoDBDriverTransactionOptions,
} from './types.js';
import { hasSortKey, isIndexStrategy } from './types.js';

function resolveStrategy(opts: AwsDynamoDBDriverOptions): ResolvedAwsDynamoDBStrategy {
  const s = opts.strategy;
  if (s === 'table_pk' || s === 'gsi_pk' || s === 'lsi' || s === 'gsi_pk_sk') return s;
  return 'table_pk_sk';
}

/**
 * Resolve partition key value for sort-key strategies.
 * Only explicit partitionKeyValue is used (driver or transaction); storagePrefix and base are not used.
 */
export function resolvePartitionKey(
  resolved: ResolvedAwsDynamoDBDriverOptions,
  _key: string,
  transactionOptions?: AwsDynamoDBDriverTransactionOptions
): string | undefined {
  if (transactionOptions?.partitionKeyValue !== undefined && transactionOptions.partitionKeyValue !== '') {
    return transactionOptions.partitionKeyValue;
  }
  if (resolved.partitionKeyValue !== undefined && resolved.partitionKeyValue !== '') {
    return resolved.partitionKeyValue;
  }
  return undefined;
}

/**
 * Build the DynamoDB key object for GetItem, PutItem, DeleteItem, Query.
 * For sort-key strategies: { [partitionKeyName]: pk, [sortKeyName]: sk } where sk = unstorage key.
 * For PK-only: { [partitionKeyName]: fullBasePrefix + key }.
 */
export function buildDynamoKey(
  resolved: ResolvedAwsDynamoDBDriverOptions,
  key: string,
  transactionOptions?: AwsDynamoDBDriverTransactionOptions
): Record<string, string> {
  validateKey(key);
  const pkName = resolved.partitionKeyName;
  if (hasSortKey(resolved.strategy)) {
    const pk = resolvePartitionKey(resolved, key, transactionOptions);
    if (pk === undefined) {
      throw new Error(
        'Partition key is required for this operation. Set partitionKeyValue on the driver or pass partitionKeyValue in the operation options.'
      );
    }
    return {
      [pkName]: pk,
      [resolved.sortKeyName!]: key,
    };
  }
  const prefix = (resolved.fullBasePrefix ?? '').trim();
  const deli = resolved.keyDelimiter;
  const fullKey = prefix ? (prefix.endsWith(deli) ? prefix + key : prefix + deli + key) : key;
  return { [pkName]: fullKey };
}

/**
 * For getKeys (PK-only): prefix to use when listing (Scan filter or Query condition).
 * For getKeys (sort-key): partition key value and optional SK prefix from base.
 * Uses transactionOptions.partitionKeyValue when resolved.partitionKeyValue is not set.
 */
export function getKeysContext(
  resolved: ResolvedAwsDynamoDBDriverOptions,
  basePrefix?: string,
  transactionOptions?: AwsDynamoDBDriverTransactionOptions
): { partitionKey?: string; keyConditionPrefix?: string; partitionKeyPrefix?: string } {
  if (hasSortKey(resolved.strategy)) {
    const pk =
      transactionOptions?.partitionKeyValue ??
      resolved.partitionKeyValue;
    const keyConditionPrefix = (basePrefix ?? '').trim();
    return { partitionKey: pk !== undefined && pk !== '' ? pk : undefined, keyConditionPrefix: keyConditionPrefix || undefined };
  }
  const fullBase = (resolved.fullBasePrefix ?? '').trim();
  const part = (basePrefix ?? '').trim();
  const deli = resolved.keyDelimiter;
  const partitionKeyPrefix = part ? (fullBase ? fullBase + deli + part : part) : fullBase;
  return { partitionKeyPrefix: partitionKeyPrefix || undefined };
}

/**
 * Create DynamoDB client from options.
 */
export function createDynamoClient(opts: AwsDynamoDBDriverOptions): DynamoDBClient {
  if (opts.dynamoDbClient) return opts.dynamoDbClient as DynamoDBClient;
  return new DynamoDBClient({
    region: opts.region,
    ...(opts.accessKeyId && opts.secretAccessKey
      ? {
        credentials: {
          accessKeyId: opts.accessKeyId,
          secretAccessKey: opts.secretAccessKey,
          ...(opts.sessionToken ? { sessionToken: opts.sessionToken } : {}),
        },
      }
      : {}),
  });
}

/**
 * Create DynamoDB Document client (from low-level client).
 */
export function createDocClient(client: DynamoDBClient): DynamoDBDocumentClient {
  return DynamoDBDocumentClient.from(client);
}

/**
 * Default key attribute names per strategy (spec defaults).
 */
function defaultPartitionKeyName(strategy: ResolvedAwsDynamoDBStrategy): string {
  return strategy === 'gsi_pk' || strategy === 'gsi_pk_sk' ? 'gpk' : 'pk';
}

function defaultSortKeyName(strategy: ResolvedAwsDynamoDBStrategy): string {
  if (strategy === 'table_pk_sk') return 'sk';
  if (strategy === 'lsi') return 'lsk';
  if (strategy === 'gsi_pk_sk') return 'gsk';
  return 'sk';
}

/**
 * Validate and resolve driver options. Creates client and doc client, applies defaults,
 * and forces readOnly for index strategies per spec.
 */
export function validateDynamoDBOptions(opts: AwsDynamoDBDriverOptions): ResolvedAwsDynamoDBDriverOptions {
  const strategy = resolveStrategy(opts);
  const resolvedBase = validateBaseDriverOptions({
    ...opts,
    storagePrefix: opts.storagePrefix ?? '',
    base: opts.base ?? '',
  });
  const resolvedAWS = validateAWSRegionAndCredentials(opts);

  if (!opts.region?.trim()) {
    throw new Error('AWS region is required for the DynamoDB driver');
  }
  const hasAnyCredField = Boolean(opts.accessKeyId || opts.secretAccessKey || opts.sessionToken);
  if (hasAnyCredField && (!opts.accessKeyId || !opts.secretAccessKey)) {
    throw new Error('Both accessKeyId and secretAccessKey are required when providing inline credentials');
  }

  if (!opts.tableName?.trim()) {
    throw new Error('tableName is required for the DynamoDB driver');
  }

  const dynamoDbClient = opts.dynamoDbClient ?? createDynamoClient(opts);
  const docClient =
    opts.docClient ?? createDocClient(dynamoDbClient as DynamoDBClient);

  const partitionKeyName = opts.partitionKeyName ?? defaultPartitionKeyName(strategy);
  const sortKeyName = hasSortKey(strategy) ? (('sortKeyName' in opts ? opts.sortKeyName : undefined) ?? defaultSortKeyName(strategy)) : undefined;
  const valueAttributeName = opts.valueAttributeName ?? 'value';
  const returnFullObject = opts.returnFullObject ?? false;
  const consistentRead = opts.consistentRead ?? false;
  const keyDelimiter = opts.keyDelimiter ?? '#';

  // Same concat order as aws-s3: storagePrefix + base. Effective key in methods = storagePrefix + base + requested key.
  const fullBasePrefix = [resolvedBase.storagePrefix, resolvedBase.base].filter(Boolean).join(keyDelimiter);

  const readOnly = isIndexStrategy(strategy) ? true : (resolvedBase.readOnly ?? false);

  return {
    ...resolvedBase,
    readOnly,
    fullBasePrefix,
    strategy,
    tableName: opts.tableName,
    partitionKeyName,
    sortKeyName,
    valueAttributeName,
    returnFullObject,
    consistentRead,
    partitionKeyValue: 'partitionKeyValue' in opts ? opts.partitionKeyValue : undefined,
    indexName: 'indexName' in opts ? opts.indexName : undefined,
    keyDelimiter,
    dynamoDbClient: dynamoDbClient as ResolvedAwsDynamoDBDriverOptions['dynamoDbClient'],
    docClient,
    ...resolvedAWS,
    region: opts.region,
  } as ResolvedAwsDynamoDBDriverOptions;
}
