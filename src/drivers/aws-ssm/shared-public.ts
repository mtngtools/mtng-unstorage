/**
 * Public SSM Utilities
 *
 * Public utilities useful for users building custom key/parameter mapping.
 * Exported from the driver index for external use.
 */

import { validateKey } from '../../utils.js';
import type { AwsSsmDriverOptions, ResolvedAWSSSMDriverOptions } from './types.js';
import type { MTBaseDriverTransactionOptions } from '../../types.js';
import { SSMClient } from '@aws-sdk/client-ssm';
import { validateBaseDriverOptions, validateAWSRegionAndCredentials } from '../../utils.js';

/**
 * Normalizes a parameter path by removing leading/trailing slashes
 * and ensuring consistent path format (SSM-driver specific).
 */
export function normalizeSsmParamPath(path: string): string {
  if (!path) return '';
  return path
    .split('/')
    .filter(Boolean)
    .join('/');
}

/**
 * Joins base path with key, handling slashes properly (SSM-driver specific).
 * SSM parameter names commonly use a leading slash; callers may prepend "/" when building the full name.
 */
export function joinSsmParamPath(base: string | undefined, key: string): string {
  if (!base) return normalizeSsmParamPath(key);

  const normalizedBase = normalizeSsmParamPath(base);
  const normalizedKey = normalizeSsmParamPath(key);

  if (!normalizedKey) return normalizedBase;
  if (!normalizedBase) return normalizedKey;

  return `${normalizedBase}/${normalizedKey}`;
}

/**
 * Build the SSM path prefix for GetParametersByPath by combining fullBasePrefix
 * and an optional unstorage basePrefix (":" separated) converted to path format.
 * Returns a path with leading slash for AWS API (e.g. "/my-app/env").
 */
export function buildSsmSearchPrefix(
  resolvedDriverOptions: { fullBasePrefix: string },
  basePrefix?: string
): string {
  let path = resolvedDriverOptions.fullBasePrefix || '';
  if (basePrefix && basePrefix.trim()) {
    const pathSegment = basePrefix.replace(/:/g, '/');
    path = joinSsmParamPath(path, pathSegment);
  }
  if (path && !path.startsWith('/')) path = '/' + path;
  if (path && !path.endsWith('/')) path += '/';
  return path || '/';
}

/**
 * Converts an unstorage key to an SSM parameter name (path with leading slash).
 */
export function mapUnstorageKeyToSsmParamName(params: {
  key: string;
  resolvedDriverOptions: { fullBasePrefix: string };
  transactionOptions?: MTBaseDriverTransactionOptions;
}): string {
  const { key, resolvedDriverOptions } = params;
  const pathSegment = key.replace(/:/g, '/');
  validateKey(pathSegment);
  const joined = joinSsmParamPath(resolvedDriverOptions.fullBasePrefix, pathSegment);
  return joined ? '/' + joined : '/';
}

/**
 * Maps an SSM parameter name back to an unstorage key (strip prefix, "/" -> ":").
 */
export function mapSsmParamNameToUnstorageKey(params: {
  key: string;
  resolvedDriverOptions: { fullBasePrefix: string };
  transactionOptions?: MTBaseDriverTransactionOptions;
}): string {
  const { key, resolvedDriverOptions } = params;
  if (!key) return '';
  let retKey = key;
  if (retKey.startsWith('/')) retKey = retKey.slice(1);
  const { fullBasePrefix } = resolvedDriverOptions;
  const prefixToStrip = fullBasePrefix ? (fullBasePrefix.startsWith('/') ? fullBasePrefix.slice(1) : fullBasePrefix) : '';
  if (prefixToStrip && retKey.startsWith(prefixToStrip)) {
    retKey = retKey.slice(prefixToStrip.length);
    if (retKey.startsWith('/')) retKey = retKey.slice(1);
  }
  return retKey.replace(/\//g, ':');
}

/**
 * Validate required SSM options (region required) and throw helpful errors.
 */
export function validateSsmOptions(
  opts: AwsSsmDriverOptions
): ResolvedAWSSSMDriverOptions {
  const resolvedBase = validateBaseDriverOptions({ ...opts, storagePrefix: opts.storagePrefix ?? '' });
  const resolvedAWS = validateAWSRegionAndCredentials(opts);

  if (!opts?.region?.trim()) {
    throw new Error('AWS region is required for the SSM driver');
  }
  const hasAnyCredField = Boolean(opts.accessKeyId || opts.secretAccessKey || opts.sessionToken);
  if (hasAnyCredField) {
    if (!opts.accessKeyId || !opts.secretAccessKey) {
      throw new Error('Both accessKeyId and secretAccessKey are required when providing inline credentials');
    }
  }

  const fullBasePrefix = joinSsmParamPath(resolvedBase.storagePrefix, resolvedBase.base);
  const ssmClient = opts.ssmClient ?? createSsmClient(opts);

  return {
    ssmClient,
    withDecryption: opts.withDecryption ?? true,
    ...resolvedBase,
    fullBasePrefix,
    ...resolvedAWS,
    region: opts.region,
  } as ResolvedAWSSSMDriverOptions;
}

/**
 * Create or return an SSMClient from options.
 */
export function createSsmClient(opts: AwsSsmDriverOptions): SSMClient {
  if (opts.ssmClient) return opts.ssmClient as SSMClient;
  return new SSMClient({
    region: opts.region,
    ...((opts.accessKeyId && opts.secretAccessKey)
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
