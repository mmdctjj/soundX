import { defineConfig } from 'father';

export default defineConfig({
  esm: {
    input: 'src',
    output: 'dist/esm'
  },
  cjs: {
    input: 'src',
    output: 'dist/cjs',
    transformer: 'babel',
  }
});
