/* Copyright (c) 2024-2024 Huawei Technologies Co., Ltd. All right reserved.
 * oeDevPlugin is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2. 
 * You may obtain a copy of Mulan PSL v2 at:
 *             http://license.coscl.org.cn/MulanPSL2 
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.  
 * See the Mulan PSL v2 for more details.
 * =================================================================================================================== */

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import VueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath, URL } from "node:url";
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { OpenDesignResolver } from '@computing/opendesign2/themes/plugins/resolver';
import svgLoader from 'vite-svg-loader'


import UnoCSS from 'unocss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    svgLoader({ defaultImport: 'component' }),
    VueDevTools(),
    UnoCSS(),
    AutoImport({
      resolvers: [
        OpenDesignResolver(ElementPlusResolver, { importStyle: 'sass' })
      ],
      imports: [
        'vue'
      ]
    }),
    Components({
      resolvers: [OpenDesignResolver(ElementPlusResolver, { importStyle: 'sass' })]
    })],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    modulePreload: false,
    outDir: "build",
    emptyOutDir: true,
    assetsInlineLimit: 99999999999,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
        manualChunks: (id: string) => {
          return 'index'
        }
      },
    },
  },
});
