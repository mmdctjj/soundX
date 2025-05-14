import { defineConfig } from 'father';

export default defineConfig({
  esm: { input: 'src' },
  prebundle: {
    deps: {}
  },
});
