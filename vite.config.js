import { defineConfig } from 'vite';
import postcssCustomProperties from 'postcss-custom-properties';

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        postcssCustomProperties(),
      ],
    },
  },
});