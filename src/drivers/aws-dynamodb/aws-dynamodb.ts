/**
 * AWS DynamoDB driver for unstorage.
 *
 * Provides conditional method availability based on options:
 * - When readOnly is true (including for index strategies lsi, gsi_pk, gsi_pk_sk):
 *   setItem, removeItem, and clear are not available.
 * - When allowClear is false or undefined: clear is not available.
 *
 * Clear is only allowed when allowClear is true and either a non-empty partitionKeyValue
 * (for sort-key strategies) or a non-empty base/storagePrefix (for PK-only, to scope deletion) is defined.
 */

import { defineDriver } from 'unstorage';
import type { AwsDynamoDBDriverOptions } from './types.js';
import { validateDynamoDBOptions } from './shared-public.js';
import { createDynamoDBNativeDriver } from './shared-internal.js';
import { AWS_DYNAMODB_DRIVER_NAME } from './types.js';
import type { ConditionalDriver, DriverFactory } from '../../types.js';

const awsDynamoDBDriver: DriverFactory<AwsDynamoDBDriverOptions, never> = defineDriver(
  (options: AwsDynamoDBDriverOptions): ConditionalDriver<typeof options> => {
    const resolvedDriverOptions = validateDynamoDBOptions({
      ...options,
      name: options.name ?? AWS_DYNAMODB_DRIVER_NAME,
      storagePrefix: options.storagePrefix ?? '',
      base: options.base ?? '',
    });

    const { name, readOnly = false, allowClear = false } = resolvedDriverOptions;

    const {
      hasItem,
      getItem,
      getItems,
      setItem,
      removeItem,
      getKeys,
      clear,
    } = createDynamoDBNativeDriver(resolvedDriverOptions);

    const driver = {
      name,
      flags: {
        maxDepth: true,
      },
      hasItem,
      getItem,
      getItems,
      getKeys,
      ...(!readOnly && {
        setItem,
        removeItem,
      }),
      ...(!readOnly && allowClear && {
        clear,
      }),
    };

    return driver as ConditionalDriver<typeof resolvedDriverOptions>;
  }
);

export default awsDynamoDBDriver;
