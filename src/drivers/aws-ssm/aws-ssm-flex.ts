import { defineDriver } from 'unstorage';
import type { Driver } from 'unstorage';
import type { StorageValue } from 'unstorage';
import type { AwsSsmFlexDriverOptions, MTSSMDriverTransactionOptions } from './types.js';
import type { DriverFactory } from '../../types/index.js';
import {
  mapUnstorageKeyToSsmParamName,
  mapSsmParamNameToUnstorageKey,
  validateSsmOptions,
} from './shared-public.js';
import { createSsmNativeDriver, type SsmNativeDriverMappers } from './shared-internal.js';
import { AWS_SSM_FLEX_DRIVER_NAME } from './types.js';

/**
 * AWS SSM Flex storage driver for unstorage with custom key and value mapping.
 *
 * Supports toStorageKey / fromStorageKey and toStorageValue / fromStorageValue.
 * Default key mapping matches the base driver (unstorage key to SSM parameter path); value mapping is pass-through.
 * Conditional method availability: readOnly and allowClear same as base.
 */

function awsSsmFlexDriver<
  TAddlDrvOpts = unknown,
  TUnstorageVal extends StorageValue = StorageValue,
  TAddlTransOpts = unknown,
>(
  options: AwsSsmFlexDriverOptions<TAddlDrvOpts, TUnstorageVal, string, TAddlTransOpts>
): Driver {
  type OptionsType = AwsSsmFlexDriverOptions<TAddlDrvOpts, TUnstorageVal, string, TAddlTransOpts>;
  const factory = defineDriver((opts: OptionsType) => {
    type NativeStorageVal = string;
    type TransactionOptions = MTSSMDriverTransactionOptions & TAddlTransOpts;

    const resolvedDriverOptions = validateSsmOptions({
      ...opts,
      name: opts.name ?? AWS_SSM_FLEX_DRIVER_NAME,
      storagePrefix: opts.storagePrefix ?? '',
    });

    const { name, readOnly = false, allowClear = false } = resolvedDriverOptions;

    type StorageKeyMappingParams = {
      key: string;
      resolvedDriverOptions: typeof resolvedDriverOptions;
      transactionOptions?: TransactionOptions;
    };

    const toStorageKey =
      opts.toStorageKey ?? ((params: StorageKeyMappingParams) => mapUnstorageKeyToSsmParamName(params));
    const fromStorageKey =
      opts.fromStorageKey ?? ((params: StorageKeyMappingParams) => mapSsmParamNameToUnstorageKey(params));
    const toStorageValue = opts.toStorageValue;
    const fromStorageValue = opts.fromStorageValue;

    if (opts.toStorageValue && !opts.fromStorageValue && !readOnly) {
      throw new Error('toStorageValue provided without fromStorageValue; provide both or set readOnly: true');
    }

    const mapToParamName = (key: string, transactionOptions?: TransactionOptions) =>
      toStorageKey({ key, resolvedDriverOptions, transactionOptions });
    const mapFromParamName = (key: string, transactionOptions?: TransactionOptions) =>
      fromStorageKey({ key, resolvedDriverOptions, transactionOptions });

    const mapValueToSsm = (input: TUnstorageVal, transactionOptions?: TransactionOptions) =>
      toStorageValue ? toStorageValue({ input, resolvedDriverOptions, transactionOptions }) : input;
    const mapValueFromSsm = (input: NativeStorageVal, transactionOptions?: TransactionOptions) =>
      fromStorageValue ? fromStorageValue({ input, resolvedDriverOptions, transactionOptions }) : input;

    const { hasItem, getItem, setItem, removeItem, getKeys, clear } = createSsmNativeDriver(
      resolvedDriverOptions,
      { mapToParamName, mapFromParamName, mapValueToSsm, mapValueFromSsm } as SsmNativeDriverMappers
    );

    return {
      name,
      flags: { maxDepth: true },
      hasItem,
      getItem,
      getKeys,
      ...(!readOnly && { setItem, removeItem }),
      ...(!readOnly && allowClear && { clear }),
    };
  }) as DriverFactory<OptionsType, never>;
  return factory(options) as Driver;
}

export default awsSsmFlexDriver;
