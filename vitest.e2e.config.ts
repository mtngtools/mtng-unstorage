import { defineConfig, loadEnv } from 'vite';

// Load environment variables for e2e test mode
// Load both .env.test.e2e and .env.test.e2e.local
const env = {
  ...loadEnv('test.e2e', process.cwd(), ''),
  ...loadEnv('test', process.cwd(), '')
};

// Vitest config for E2E tests - no AWS SDK mocking
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.e2e.ts'],
    // Pass environment variables to the test process.
    // Merge shell env so variables like AWS_ACCESS_KEY_ID are preserved
    // even when not present in .env files.
    env: {
      ...process.env,
      ...env,
      NODE_ENV: 'test'
    }
  }
});