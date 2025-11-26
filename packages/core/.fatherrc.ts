import { defineConfig } from 'father';

export default defineConfig({
  esm: { input: 'src' },
  cjs: { input: 'src' },
  prebundle: {
    deps: {}
  },
});
