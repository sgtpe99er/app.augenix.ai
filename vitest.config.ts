import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/app/api/**/*.ts',
        'src/features/**/*.ts',
        'src/libs/**/*.ts',
      ],
      exclude: ['src/libs/supabase/types.ts'],
    },
  },
});
