import { defineConfig } from 'vitest/config'

// Pruebas contra un backend real (sandbox). No forman parte de `npm test`.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/autorizacion/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
})
