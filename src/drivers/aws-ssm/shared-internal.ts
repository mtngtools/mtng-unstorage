/**
 * SSM native driver implementation
 *
 * Implements hasItem, getItem, setItem, removeItem, getKeys, clear using AWS SSM API.
 * Supports optional key/value mappers for the flex driver; when omitted, uses default key mapping and pass-through values.
 * Internal only; not exported from the driver index.
 */

import {
  GetParameterCommand,
  PutParameterCommand,
  DeleteParameterCommand,
  GetParametersByPathCommand,
} from '@aws-sdk/client-ssm';
import { clearByListingAndBatching } from '../../utils.js';
import { filterKeyByDepth } from 'unstorage';
import {
  mapUnstorageKeyToSsmParamName,
  mapSsmParamNameToUnstorageKey,
  buildSsmSearchPrefix,
} from './shared-public.js';
import type { ResolvedAWSSSMDriverOptions, MTSSMDriverTransactionOptions } from './types.js';

function withDecryptionForRequest(resolved: ResolvedAWSSSMDriverOptions, opts?: MTSSMDriverTransactionOptions): boolean {
  return opts?.withDecryption ?? resolved.withDecryption;
}

export type SsmNativeDriverMappers = {
  mapToParamName: (key: string, transactionOptions?: MTSSMDriverTransactionOptions) => string;
  mapFromParamName: (paramName: string, transactionOptions?: MTSSMDriverTransactionOptions) => string;
  mapValueToSsm: (value: unknown, transactionOptions?: MTSSMDriverTransactionOptions) => unknown | Promise<unknown>;
  mapValueFromSsm: (value: string, transactionOptions?: MTSSMDriverTransactionOptions) => unknown | Promise<unknown>;
};

function defaultMappers(resolvedOptions: ResolvedAWSSSMDriverOptions): SsmNativeDriverMappers {
  return {
    mapToParamName: (key, transactionOptions) =>
      mapUnstorageKeyToSsmParamName({ key, resolvedDriverOptions: resolvedOptions, transactionOptions }),
    mapFromParamName: (paramName, transactionOptions) =>
      mapSsmParamNameToUnstorageKey({ key: paramName, resolvedDriverOptions: resolvedOptions, transactionOptions }),
    mapValueToSsm: (value) => value,
    mapValueFromSsm: (value) => value,
  };
}

export function createSsmNativeDriver(
  resolvedOptions: ResolvedAWSSSMDriverOptions,
  mappers?: SsmNativeDriverMappers
) {
  const client = resolvedOptions.ssmClient;
  const {
    mapToParamName,
    mapFromParamName,
    mapValueToSsm,
    mapValueFromSsm,
  } = mappers ?? defaultMappers(resolvedOptions);

  const hasItem = async (key: string, _opts?: MTSSMDriverTransactionOptions) => {
    try {
      const Name = mapToParamName(key, _opts);
      await client.send(new GetParameterCommand({ Name, WithDecryption: withDecryptionForRequest(resolvedOptions, _opts) }));
      return true;
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === 'ParameterNotFound' || (err as { Code?: string })?.Code === 'ParameterNotFound') return false;
      throw err;
    }
  };

  const getItem = async <T = unknown>(key: string, _opts?: MTSSMDriverTransactionOptions): Promise<T | null> => {
    try {
      const Name = mapToParamName(key, _opts);
      const out = await client.send(new GetParameterCommand({ Name, WithDecryption: withDecryptionForRequest(resolvedOptions, _opts) }));
      const rawValue = out.Parameter?.Value;
      if (rawValue == null) return null;
      try {
        const mapped = await mapValueFromSsm(rawValue, _opts);
        return (mapped ?? null) as T | null;
      } catch {
        // Value mapping errors (e.g. fromStorageValue throws): return null to match S3 flex behavior
        return null;
      }
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      const code = (err as { Code?: string })?.Code;
      if (name === 'ParameterNotFound' || code === 'ParameterNotFound') return null;
      throw err;
    }
  };

  const setItem = async (key: string, value: unknown, _opts?: MTSSMDriverTransactionOptions) => {
    const Name = mapToParamName(key, _opts);
    const storageValue = await mapValueToSsm(value, _opts);
    const valueStr = typeof storageValue === 'string' ? storageValue : String(storageValue);
    await client.send(
      new PutParameterCommand({
        Name,
        Value: valueStr,
        Type: 'String',
        Overwrite: true,
      })
    );
  };

  const removeItem = async (key: string, _opts?: MTSSMDriverTransactionOptions) => {
    const Name = mapToParamName(key, _opts);
    await client.send(new DeleteParameterCommand({ Name }));
  };

  const getKeys = async (base?: string, _opts?: MTSSMDriverTransactionOptions): Promise<string[]> => {
    const keys: string[] = [];
    let nextToken: string | undefined;
    const maxDepth = _opts?.maxDepth ?? resolvedOptions.maxDepth;
    const pathPrefix = buildSsmSearchPrefix(resolvedOptions, base);

    do {
      const response = await client.send(
        new GetParametersByPathCommand({
          Path: pathPrefix,
          Recursive: true,
          WithDecryption: withDecryptionForRequest(resolvedOptions, _opts),
          MaxResults: 10,
          NextToken: nextToken,
        })
      );
      const parameters = response.Parameters ?? [];
      for (const p of parameters) {
        const name = p.Name;
        if (!name) continue;
        const unstorageKey = mapFromParamName(name, _opts);
        if (unstorageKey && filterKeyByDepth(unstorageKey, maxDepth)) {
          keys.push(unstorageKey);
        }
      }
      nextToken = response.NextToken;
    } while (nextToken);

    return keys;
  };

  const clear = async (base: string, opts?: unknown): Promise<void> => {
    const fullBasePrefix = resolvedOptions.fullBasePrefix?.trim() ?? '';
    const effectivePrefix = fullBasePrefix.startsWith('/') ? fullBasePrefix : (fullBasePrefix ? '/' + fullBasePrefix : '');
    if (!effectivePrefix || effectivePrefix === '/') {
      throw new Error('SSM driver clear is not allowed on root path (/) or empty prefix. Set storagePrefix or base to scope the driver.');
    }
    await clearByListingAndBatching({
      opts,
      baseToClear: base ?? '',
      getKeys,
      removeItem,
    });
  };

  return {
    hasItem,
    getItem,
    setItem,
    removeItem,
    getKeys,
    clear,
  };
}
