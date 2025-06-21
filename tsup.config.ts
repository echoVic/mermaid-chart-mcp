import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'server/index': 'src/server/index.ts',
    'server/simple-mcp-server': 'src/server/simple-mcp-server.ts',
    'server/sse-transport': 'src/server/sse-transport.ts',
    'server/utils': 'src/server/utils.ts',
  },
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  dts: true,
  splitting: false,
  treeshake: true,
  minify: false,
  bundle: true,
  external: [
    '@modelcontextprotocol/sdk',
    'express',
    'jsdom',
    'mermaid',
    'zod'
  ],
  banner: {
    js: '#!/usr/bin/env node'
  },
  onSuccess: async () => {
    console.log('✅ Build completed successfully!');
  }
}); 