import { defineConfig } from 'vitest/config';
import dts from 'vite-plugin-dts';
import oxlint from 'vite-plugin-oxlint';

export default defineConfig({
  plugins: [
    // @ts-ignore
    oxlint(),
    // @ts-ignore
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts', 'tests-e2e/**/*']
    })
  ],
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        types: 'src/types/index.ts',
        utils: 'src/utils/index.ts',
        'drivers/aws-s3/index': 'src/drivers/aws-s3/index.ts',
        'drivers/aws-ssm/index': 'src/drivers/aws-ssm/index.ts',
        'drivers/aws-ddb/index': 'src/drivers/aws-ddb/index.ts'
      },
      name: 'MtngUnstorage',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['@aws-sdk/client-dynamodb', '@aws-sdk/client-s3', '@aws-sdk/client-ssm', '@aws-sdk/lib-dynamodb', 'unstorage'],
      output: {
        exports: 'named',
        globals: {
          '@aws-sdk/client-dynamodb': 'AWS_DynamoDB',
          '@aws-sdk/client-s3': 'AWS_S3',
          '@aws-sdk/client-ssm': 'AWS_SSM',
          '@aws-sdk/lib-dynamodb': 'AWS_LibDynamoDB',
          'unstorage': 'Unstorage'
        }
      }
    },
    target: 'es2020',
    minify: false,
    sourcemap: true
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests-e2e/**',
      '**/tests/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests-e2e/**',
        'tests/e2e/**',
        '**/*.test.ts',
        '**/*.d.ts'
      ]
    },
    setupFiles: ['./vitest.setup.ts'],
    env: {
      VITEST_MODE: 'integration'
    }
  }
})