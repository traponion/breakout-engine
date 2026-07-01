import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/i18n/**', 'src/**/types.ts', 'src/core/entities.ts'],
      thresholds: {
        lines: 25,
        branches: 22,
        statements: 25,
        functions: 35,
      },
    },
  },
});
