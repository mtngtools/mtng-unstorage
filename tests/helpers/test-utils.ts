/**
 * Test utilities for conditional test execution
 */

import { it, describe } from 'vitest'

/**
 * Skip test if running in E2E mode
 * Use this for tests that should only run in integration (with mocks)
 * 
 * @example
 * itSkipInE2E('validates bucket is required', () => {
 *   expect(() => makeDriver({ bucket: '' })).toThrow('S3 bucket name is required')
 * })
 */
export function itSkipInE2E(name: string, fn?: () => void | Promise<void>, timeout?: number) {
  if (process.env.VITEST_MODE === 'e2e') {
    return it.skip(name, fn, timeout)
  }
  return it(name, fn, timeout)
}

/**
 * Skip describe block if running in E2E mode
 * 
 * @example
 * describeSkipInE2E('mock-specific behavior', () => {
 *   // These tests only run in integration
 * })
 */
export function describeSkipInE2E(name: string, fn: () => void) {
  if (process.env.VITEST_MODE === 'e2e') {
    return describe.skip(name, fn)
  }
  return describe(name, fn)
}

/**
 * Check if currently running in E2E mode
 */
export const isE2EMode = () => process.env.VITEST_MODE === 'e2e'

/**
 * Check if currently running in integration mode
 */
export const isIntegrationMode = () => process.env.VITEST_MODE !== 'e2e'

