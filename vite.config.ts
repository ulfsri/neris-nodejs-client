import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig(({}) => ({
  plugins: [],
  test: {
    globals: true,
    clearMocks: true,
    unstubEnvs: true,
  },
}));
