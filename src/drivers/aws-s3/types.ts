import type { MTBaseDriverOptions } from '../../types';

/**
 * Flex options extend the base driver options so future additional fields
 * can be added without changing the original base type.
 */
export type AwsS3FlexDriverOptions = MTBaseDriverOptions & {
  // placeholder for future flex driver options
}

export default {} as const;
