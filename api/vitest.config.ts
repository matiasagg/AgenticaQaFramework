import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Root explícito para que vitest siempre corra desde api/
  root: __dirname,
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Excluir archivos de Playwright y otros que no son tests de vitest
    exclude: [
      'node_modules/**',
      'dist/**',
      'e2e/**',
      '**/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/services/**/*.ts', 'src/middleware/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
