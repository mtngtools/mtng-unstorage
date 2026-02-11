/**
 * AWS DynamoDB native driver implementation
 *
 * Implements hasItem, getItem, getItems, setItem, removeItem, getKeys, clear using
 * DynamoDBDocumentClient (GetCommand, BatchGetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand, BatchWriteCommand).
 * getItems uses BatchGetItem (up to 100 keys per request). Clear uses BatchWriteItem (up to 25 deletes per request).
 * Internal only; not exported from the driver index.
 */

import {
  GetCommand,
  BatchGetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { filterKeyByDepth } from 'unstorage';
import { buildDynamoKey, getKeysContext, resolvePartitionKey } from './shared-public.js';
import type { ResolvedAwsDynamoDBDriverOptions, AwsDynamoDBDriverTransactionOptions } from './types.js';
import { hasSortKey } from './types.js';

function consistentReadForRequest(
  resolved: ResolvedAwsDynamoDBDriverOptions,
  opts?: AwsDynamoDBDriverTransactionOptions
): boolean {
  return opts?.consistentRead ?? resolved.consistentRead;
}

export function createDynamoDBNativeDriver(resolved: ResolvedAwsDynamoDBDriverOptions) {
  const doc = resolved.docClient;
  const tableName = resolved.tableName;
  const valueAttr = resolved.valueAttributeName;
  const returnFull = resolved.returnFullObject;
  const pkName = resolved.partitionKeyName;
  const skName = resolved.sortKeyName;

  const hasItem = async (key: string, opts?: AwsDynamoDBDriverTransactionOptions): Promise<boolean> => {
    const Key = buildDynamoKey(resolved, key, opts);
    const result = await doc.send(
      new GetCommand({
        TableName: tableName,
        Key,
        ProjectionExpression: pkName + (skName ? ', ' + skName : ''),
        ConsistentRead: consistentReadForRequest(resolved, opts),
        ...(resolved.indexName && { IndexName: resolved.indexName }),
      })
    );
    return result.Item != null;
  };

  const getItem = async <T = unknown>(
    key: string,
    opts?: AwsDynamoDBDriverTransactionOptions
  ): Promise<T | null> => {
    const Key = buildDynamoKey(resolved, key, opts);
    const result = await doc.send(
      new GetCommand({
        TableName: tableName,
        Key,
        ConsistentRead: consistentReadForRequest(resolved, opts),
        ...(resolved.indexName && { IndexName: resolved.indexName }),
      })
    );
    const item = result.Item;
    if (item == null) return null;
    if (returnFull) return item as T;
    const raw = item[valueAttr];
    if (raw === undefined) return null;
    if (typeof raw === 'string' && (raw.startsWith('{') || raw.startsWith('['))) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as T;
      }
    }
    return raw as T;
  };

  /** Extract value from a DynamoDB item (same logic as getItem). */
  function itemToValue<T = unknown>(item: Record<string, unknown> | null | undefined): T | null {
    if (item == null) return null;
    if (returnFull) return item as T;
    const raw = item[valueAttr];
    if (raw === undefined) return null;
    if (typeof raw === 'string' && (raw.startsWith('{') || raw.startsWith('['))) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as T;
      }
    }
    return raw as T;
  }

  /** Build unstorage key from a DynamoDB item (for matching BatchGet results). */
  function itemToUnstorageKey(item: Record<string, unknown>): string {
    if (skName && item[skName] != null) return String(item[skName]);
    return String(item[pkName]);
  }

  const getItems = async (
    items: { key: string }[],
    opts?: AwsDynamoDBDriverTransactionOptions
  ): Promise<{ key: string; value: unknown }[]> => {
    if (items.length === 0) return [];
    const keys = items.map((it) => (typeof it === 'string' ? it : it.key));

    if (opts?.returnStartsWithKey === true && keys.length === 1) {
      const prefix = keys[0];
      const results: { key: string; value: unknown }[] = [];
      if (hasSortKey(resolved.strategy)) {
        const pk = resolvePartitionKey(resolved, prefix, opts);
        if (pk === undefined) return [];
        let lastKey: Record<string, unknown> | undefined;
        do {
          const result = await doc.send(
            new QueryCommand({
              TableName: tableName,
              KeyConditionExpression: `${pkName} = :pk AND begins_with(${skName}, :skPrefix)`,
              ExpressionAttributeValues: { ':pk': pk, ':skPrefix': prefix },
              ConsistentRead: consistentReadForRequest(resolved, opts),
              ExclusiveStartKey: lastKey,
            })
          );
          const itemsPage = (result.Items ?? []) as Record<string, unknown>[];
          for (const item of itemsPage) {
            results.push({ key: itemToUnstorageKey(item), value: itemToValue(item) });
          }
          lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
        } while (lastKey);
        return results;
      }
      const base = (resolved.fullBasePrefix ?? '').trim();
      const fullPrefix = base ? (base.endsWith(':') ? base + prefix : base + ':' + prefix) : prefix;
      let lastKey: Record<string, unknown> | undefined;
      do {
        const result = await doc.send(
          new ScanCommand({
            TableName: tableName,
            FilterExpression: `begins_with(${pkName}, :prefix)`,
            ExpressionAttributeValues: { ':prefix': fullPrefix },
            ExclusiveStartKey: lastKey,
          })
        );
        const itemsPage = (result.Items ?? []) as Record<string, unknown>[];
        for (const item of itemsPage) {
          const ukey = itemToUnstorageKey(item);
          results.push({ key: ukey, value: itemToValue(item) });
        }
        lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
      } while (lastKey);
      return results;
    }

    const BATCH_SIZE = 100;
    const valueByKey = new Map<string, unknown>();
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const chunk = keys.slice(i, i + BATCH_SIZE);
      const ddbKeys = chunk.map((key) => buildDynamoKey(resolved, key, opts));
      let unprocessedKeys = ddbKeys;
      while (unprocessedKeys.length > 0) {
        const result = await doc.send(
          new BatchGetCommand({
            RequestItems: {
              [tableName]: {
                Keys: unprocessedKeys,
                ConsistentRead: consistentReadForRequest(resolved, opts),
              },
            },
          })
        );
        const tableResponse = result.Responses?.[tableName] ?? [];
        for (const item of tableResponse as Record<string, unknown>[]) {
          const ukey = itemToUnstorageKey(item);
          valueByKey.set(ukey, itemToValue(item));
        }
        const unprocessed = result.UnprocessedKeys?.[tableName]?.Keys;
        unprocessedKeys = (unprocessed ?? []) as Record<string, string>[];
      }
    }
    return keys.map((key) => ({ key, value: valueByKey.get(key) ?? null }));
  };

  const setItem = async (key: string, value: unknown, opts?: AwsDynamoDBDriverTransactionOptions): Promise<void> => {
    const Key = buildDynamoKey(resolved, key, opts);
    let Item: Record<string, unknown>;
    if (returnFull && value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Item = { ...(value as Record<string, unknown>), ...Key };
    } else {
      const stored =
        typeof value === 'string' ? value : typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
      Item = { ...Key, [valueAttr]: stored };
    }
    await doc.send(
      new PutCommand({
        TableName: tableName,
        Item,
      })
    );
  };

  const removeItem = async (key: string, opts?: AwsDynamoDBDriverTransactionOptions): Promise<void> => {
    const Key = buildDynamoKey(resolved, key, opts);
    await doc.send(
      new DeleteCommand({
        TableName: tableName,
        Key,
      })
    );
  };

  const getKeys = async (
    basePrefix?: string,
    opts?: AwsDynamoDBDriverTransactionOptions
  ): Promise<string[]> => {
    const maxDepth = opts?.maxDepth ?? resolved.maxDepth;
    const ctx = getKeysContext(resolved, basePrefix ?? '');

    if (hasSortKey(resolved.strategy)) {
      const pk = ctx.partitionKey;
      if (pk === undefined) return [];
      const skPrefix = ctx.keyConditionPrefix;
      const keyCond = skPrefix
        ? `${pkName} = :pk AND begins_with(${skName}, :skPrefix)`
        : `${pkName} = :pk`;
      const params: Record<string, unknown> = { ':pk': pk };
      if (skPrefix) params[':skPrefix'] = skPrefix;

      const keys: string[] = [];
      let lastKey: Record<string, unknown> | undefined;
      do {
        const result = await doc.send(
          new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: keyCond,
            ExpressionAttributeValues: params,
            ProjectionExpression: skName,
            ConsistentRead: consistentReadForRequest(resolved, opts),
            ExclusiveStartKey: lastKey,
            ...(resolved.indexName && { IndexName: resolved.indexName }),
          })
        );
        const items = result.Items ?? [];
        for (const item of items) {
          const sk = item[skName!];
          if (sk != null) {
            const k = String(sk);
            if (filterKeyByDepth(k, maxDepth)) keys.push(k);
          }
        }
        lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
      } while (lastKey);
      return keys;
    }

    const prefix = ctx.partitionKeyPrefix ?? '';
    const keys: string[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await doc.send(
        new ScanCommand({
          TableName: tableName,
          ...(prefix && {
            FilterExpression: `begins_with(${pkName}, :prefix)`,
            ExpressionAttributeValues: { ':prefix': prefix },
          }),
          ProjectionExpression: pkName,
          ExclusiveStartKey: lastKey,
          ...(resolved.indexName && { IndexName: resolved.indexName }),
        })
      );
      const items = result.Items ?? [];
      for (const item of items) {
        const pk = item[pkName];
        if (pk != null) {
          const k = String(pk);
          if (filterKeyByDepth(k, maxDepth)) keys.push(k);
        }
      }
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
    return keys;
  };

  const clear = async (base: string, clearOpts?: unknown): Promise<void> => {
    const fullBase = (resolved.fullBasePrefix ?? '').trim();
    if (!resolved.allowClear) {
      throw new Error('DynamoDB driver clear is not allowed. Set allowClear: true to enable.');
    }
    if (hasSortKey(resolved.strategy)) {
      const partitionKey = resolved.partitionKeyValue;
      if (partitionKey === undefined || partitionKey === '') {
        throw new Error(
          'DynamoDB driver clear for sort-key strategy requires a non-empty partitionKeyValue (driver or transaction options).'
        );
      }
    } else {
      if (!fullBase) {
        throw new Error(
          'DynamoDB driver clear for PK-only strategy requires a non-empty base or storagePrefix to scope deletion.'
        );
      }
    }

    const keys = await getKeys(base ?? '', clearOpts as AwsDynamoDBDriverTransactionOptions);
    const BATCH_SIZE = 25;
    type DeleteRequestItem = { DeleteRequest: { Key: Record<string, string> } };
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const chunk = keys.slice(i, i + BATCH_SIZE);
      const deleteRequests: DeleteRequestItem[] = chunk.map((key) => ({
        DeleteRequest: { Key: buildDynamoKey(resolved, key) },
      }));
      let unprocessed: DeleteRequestItem[] = deleteRequests;
      while (unprocessed.length > 0) {
        const result = await doc.send(
          new BatchWriteCommand({
            RequestItems: { [tableName]: unprocessed },
          })
        );
        const raw = result.UnprocessedItems?.[tableName];
        unprocessed = (raw ?? []) as DeleteRequestItem[];
      }
    }
  };

  return {
    hasItem,
    getItem,
    getItems,
    setItem,
    removeItem,
    getKeys,
    clear,
  };
}
