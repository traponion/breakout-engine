import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
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
