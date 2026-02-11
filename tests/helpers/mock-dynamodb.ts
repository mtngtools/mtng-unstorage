/**
 * In-memory mock for DynamoDB DocumentClient.send().
 * Used by aws-ddb driver integration tests. Stores items by table and primary key.
 * Supports GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand,
 * BatchGetCommand, and BatchWriteCommand.
 */

type KeyRecord = Record<string, string>;

function keyToString(key: KeyRecord | null | undefined): string {
  if (key == null || typeof key !== 'object') return '';
  const sorted = Object.keys(key)
    .sort()
    .reduce((acc, k) => ({ ...acc, [k]: key[k] }), {} as KeyRecord);
  return JSON.stringify(sorted);
}

/**
 * In-memory table storage: tableName -> (keyStr -> item)
 */
const tableStore = new Map<string, Map<string, Record<string, unknown>>>();

function getTable(tableName: string): Map<string, Record<string, unknown>> {
  let t = tableStore.get(tableName);
  if (!t) {
    t = new Map();
    tableStore.set(tableName, t);
  }
  return t;
}

function getItem(tableName: string, key: KeyRecord | null | undefined): Record<string, unknown> | undefined {
  if (key == null || typeof key !== 'object') return undefined;
  const canonical = normalizeKey(key);
  const k = keyToString(canonical);
  return k ? getTable(tableName).get(k) : undefined;
}

const KEY_ATTRS = ['pk', 'sk', 'gpk', 'gsk', 'lsk'] as const;

function keyFromItem(item: Record<string, unknown>): KeyRecord {
  const key: KeyRecord = {};
  for (const k of KEY_ATTRS) {
    const v = item[k];
    if (v !== undefined && v !== null) key[k] = String(v);
  }
  return key;
}

/** Normalize key so that pk/sk/lsk/gpk/gsk are comparable (same item under table vs LSI/GSI). */
function normalizeKey(key: KeyRecord): KeyRecord {
  const pk = key.pk ?? key.gpk;
  const sk = key.sk ?? key.lsk ?? key.gsk;
  const out: KeyRecord = {};
  if (pk !== undefined) out.pk = String(pk);
  if (sk !== undefined) out.sk = String(sk);
  return out;
}

/** Ensure item has lsk/gpk/gsk so LSI/GSI readers can use itemToUnstorageKey. */
function withIndexAliases(item: Record<string, unknown>): Record<string, unknown> {
  const out = { ...item };
  if (out.pk !== undefined && out.gpk === undefined) out.gpk = out.pk;
  if (out.sk !== undefined) {
    if (out.lsk === undefined) out.lsk = out.sk;
    if (out.gsk === undefined) out.gsk = out.sk;
  }
  return out;
}

function putItem(tableName: string, item: Record<string, unknown>): void {
  const key = keyFromItem(item);
  if (Object.keys(key).length === 0) return;
  getTable(tableName).set(keyToString(key), { ...item });
}

function deleteItem(tableName: string, key: KeyRecord): void {
  const canonical = normalizeKey(key);
  getTable(tableName).delete(keyToString(canonical));
}

function* listItems(
  tableName: string,
  filter?: { pk?: string; skPrefix?: string; pkPrefix?: string }
): Generator<Record<string, unknown>> {
  const table = getTable(tableName);
  for (const item of table.values()) {
    const pkVal = (item.pk ?? item.gpk) as string | undefined;
    const skVal = (item.sk ?? item.lsk ?? item.gsk) as string | undefined;
    if (filter?.pk !== undefined && pkVal !== filter.pk) continue;
    if (filter?.skPrefix !== undefined) {
      if (skVal == null || !skVal.startsWith(filter.skPrefix)) continue;
    }
    if (filter?.pkPrefix !== undefined && (pkVal == null || !pkVal.startsWith(filter.pkPrefix))) continue;
    yield item;
  }
}

/**
 * Mock DynamoDB DocumentClient. Implements send(command) for Get, Put, Delete, Query, Scan, BatchGet, BatchWrite.
 * Use docClient: mockDocClient in driver options to inject.
 */
export class MockDynamoDBDocumentClient {
  /** Reset all tables (call between tests if needed). */
  static reset(): void {
    tableStore.clear();
  }

  async send(command: { constructor?: { name?: string }; input?: Record<string, unknown> }): Promise<Record<string, unknown>> {
    const ctorName = command?.constructor?.name ?? '';
    const input = (command?.input ?? command ?? {}) as Record<string, unknown>;
    const tableName = input.TableName as string;

    // GetCommand
    if (/^GetCommand$/i.test(ctorName)) {
      const Key = input.Key as KeyRecord;
      const item = getItem(tableName, Key);
      return { Item: item ? withIndexAliases(item) : undefined };
    }

    // PutCommand
    if (/^PutCommand$/i.test(ctorName) || (input.Item !== undefined && !Array.isArray(input.Item))) {
      const Item = input.Item as Record<string, unknown>;
      putItem(tableName, Item);
      return {};
    }

    // DeleteCommand
    if (/^DeleteCommand$/i.test(ctorName)) {
      const Key = input.Key as KeyRecord;
      deleteItem(tableName, Key);
      return {};
    }

    // QueryCommand
    if (/QueryCommand/i.test(ctorName) || (input.KeyConditionExpression !== undefined)) {
      const values = (input.ExpressionAttributeValues as Record<string, unknown>) ?? {};
      const pk = values[':pk'] as string | undefined;
      const skPrefix = values[':skPrefix'] as string | undefined;
      const proj = input.ProjectionExpression as string | undefined;
      const items = Array.from(listItems(tableName, { pk, skPrefix }));
      // Map index key names: same item may have sk (table) and lsk (LSI), gpk/gsk (GSI)
      const projectKeys = proj ? proj.split(',').map((s) => s.trim()) : null;
      const projected = projectKeys
        ? items.map((item) => {
          const out: Record<string, unknown> = {};
          for (const k of projectKeys!) {
            const v = item[k] ?? (k === 'lsk' ? item.sk : k === 'gpk' ? item.pk : k === 'gsk' ? item.sk : undefined);
            if (v !== undefined) out[k] = v;
          }
          return out;
        })
        : items;
      return { Items: projected, LastEvaluatedKey: undefined };
    }

    // ScanCommand
    if (/ScanCommand/i.test(ctorName) || (input.FilterExpression !== undefined && input.KeyConditionExpression === undefined)) {
      const values = (input.ExpressionAttributeValues as Record<string, unknown>) ?? {};
      const prefix = values[':prefix'] as string | undefined;
      const proj = input.ProjectionExpression as string | undefined;
      const items = Array.from(listItems(tableName, prefix ? { pkPrefix: prefix } : undefined));
      const projectKeys = proj ? proj.split(',').map((s) => s.trim()) : null;
      const projected = projectKeys
        ? items.map((item) => projectKeys.reduce((acc, k) => ({ ...acc, [k]: item[k] }), {} as Record<string, unknown>))
        : items;
      return { Items: projected, LastEvaluatedKey: undefined };
    }

    // BatchGetCommand (Keys per table) – check before BatchWrite
    const reqItems = input.RequestItems as Record<string, unknown> | undefined;
    if (reqItems && Object.keys(reqItems).length > 0) {
      const firstVal = Object.values(reqItems)[0] as Record<string, unknown> | unknown[] | undefined;
      const isBatchGet =
        firstVal != null &&
        !Array.isArray(firstVal) &&
        typeof firstVal === 'object' &&
        'Keys' in firstVal &&
        Array.isArray((firstVal as { Keys: unknown[] }).Keys);
      if (isBatchGet) {
        const req = input.RequestItems as Record<string, { Keys: KeyRecord[] }>;
        const responses: Record<string, unknown[]> = {};
        for (const [tbl, spec] of Object.entries(req ?? {})) {
          const keys = spec.Keys ?? [];
          const wanted = new Set(
            keys
              .filter((key): key is KeyRecord => key != null && typeof key === 'object')
              .map((key) => keyToString(normalizeKey(key)))
          );
          const allInTable = Array.from(listItems(tbl));
          const matched = allInTable.filter((item) =>
            wanted.has(keyToString(keyFromItem(item)))
          );
          responses[tbl] = matched.map(withIndexAliases);
        }
        return { Responses: responses, UnprocessedKeys: undefined };
      }
      if (Array.isArray(firstVal)) {
        const req = reqItems as Record<string, Array<{ PutRequest?: { Item: Record<string, unknown> }; DeleteRequest?: { Key: KeyRecord } }>>;
        for (const [tbl, writes] of Object.entries(req)) {
          for (const w of writes ?? []) {
            if (w.PutRequest?.Item) putItem(tbl, w.PutRequest.Item);
            if (w.DeleteRequest?.Key) deleteItem(tbl, w.DeleteRequest.Key);
          }
        }
        return { UnprocessedItems: undefined };
      }
    }

    return {};
  }
}

/**
 * Create a fresh mock document client. All clients share the same in-memory store
 * so that Writer and Reader drivers (same table) see the same data.
 */
export function createMockDynamoDBDocumentClient(): MockDynamoDBDocumentClient {
  return new MockDynamoDBDocumentClient();
}

export default MockDynamoDBDocumentClient;
