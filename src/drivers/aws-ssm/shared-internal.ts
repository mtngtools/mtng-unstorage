/**
 * SSM native driver implementation
 *
 * Implements hasItem, getItem, setItem, removeItem, getKeys, clear using AWS SSM API.
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

export function createSsmNativeDriver(
  resolvedOptions: ResolvedAWSSSMDriverOptions
) {
  const client = resolvedOptions.ssmClient;
  const mapToParamName = (key: string, transactionOptions?: MTSSMDriverTransactionOptions) =>
    mapUnstorageKeyToSsmParamName({ key, resolvedDriverOptions: resolvedOptions, transactionOptions });
  const mapFromParamName = (paramName: string, transactionOptions?: MTSSMDriverTransactionOptions) =>
    mapSsmParamNameToUnstorageKey({ key: paramName, resolvedDriverOptions: resolvedOptions, transactionOptions });

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
      const value = out.Parameter?.Value;
      return (value ?? null) as T | null;
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      const code = (err as { Code?: string })?.Code;
      if (name === 'ParameterNotFound' || code === 'ParameterNotFound') return null;
      throw err;
    }
  };

  const setItem = async (key: string, value: string, _opts?: MTSSMDriverTransactionOptions) => {
    const Name = mapToParamName(key, _opts);
    await client.send(
      new PutParameterCommand({
        Name,
        Value: value,
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
