import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'config/index': 'src/config/index.ts',
    'demo/index': 'src/demo/index.ts',
    'errors/index': 'src/errors/index.ts',
    'validate/index': 'src/validate/index.ts',
    'logger/index': 'src/logger/index.ts',
    'server/index': 'src/server/index.ts',
    'telemetry/index': 'src/telemetry/index.ts',
    'payment/index': 'src/payment/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
})
