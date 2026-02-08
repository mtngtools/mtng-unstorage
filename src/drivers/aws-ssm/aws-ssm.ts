/**
 * AWS Systems Manager Parameter Store driver for unstorage.
 *
 * Provides conditional method availability based on options:
 * - When `readOnly: true`: `setItem`, `removeItem`, and `clear` are not available
 * - When `allowClear: false` or undefined: `clear` is not available
 *
 * Clear is only allowed when `allowClear: true` and a non-empty prefix (storagePrefix or base);
 * clear on root path (/) is refused for safety.
 */

import { defineDriver } from 'unstorage';
import type { AwsSsmDriverOptions } from './types.js';
import { validateSsmOptions } from './shared-public.js';
import { createSsmNativeDriver } from './shared-internal.js';
import { AWS_SSM_DRIVER_NAME } from './types.js';
import type { ConditionalDriver, DriverFactory } from '../../types.js';

const awsSsmDriver: DriverFactory<AwsSsmDriverOptions, never> = defineDriver((options: AwsSsmDriverOptions): ConditionalDriver<typeof options> => {
  const resolvedDriverOptions = validateSsmOptions({
    ...options,
    name: options.name ?? AWS_SSM_DRIVER_NAME,
    storagePrefix: options.storagePrefix ?? '',
  });

  const { name, readOnly = false, allowClear = false } = resolvedDriverOptions;

  const {
    hasItem,
    getItem,
    setItem,
    removeItem,
    getKeys,
    clear,
  } = createSsmNativeDriver(resolvedDriverOptions);

  const driver: ConditionalDriver<typeof resolvedDriverOptions> = {
    name,
    flags: {
      maxDepth: true,
    },
    hasItem,
    getItem,
    getKeys,
    ...(!readOnly && {
      setItem,
      removeItem,
    }),
    ...(!readOnly && allowClear && {
      clear,
    }),
  };

  return driver;
});

export default awsSsmDriver;
