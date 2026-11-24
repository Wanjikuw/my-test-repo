import { defineConfig } from 'vitest/config';

// The app's tsconfig leaves JSX for Next to compile, which is more than esbuild will do on its
// own. This is what lets a component be rendered in a test.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
});
