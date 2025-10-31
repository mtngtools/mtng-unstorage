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
    // Pass environment variables to the test process
    env: {
      ...env,
      NODE_ENV: 'test'
    }
  }
});