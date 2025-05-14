import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { TDesignResolver } from 'unplugin-vue-components/resolvers'
import { VueMcp } from "vite-plugin-vue-mcp";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/music": {
        target: "http://localhost:1900", // 后端服务地址
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/music/, ""),
      },
    },
  },
  plugins: [
    vue(),
    VueMcp({
      host: "localhost",
    }),
    vueDevTools(),
    AutoImport({
      resolvers: [
        TDesignResolver({
          library: "vue-next",
        }),
      ],
    }),
    Components({
      resolvers: [
        TDesignResolver({
          library: "vue-next",
        }),
      ],
    }),
  ],
});
