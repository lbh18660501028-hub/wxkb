/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3001,
    host: true,
  },
  test: {
    // 测试文件匹配规则：src 下所有 .test.ts 文件
    include: ['src/**/*.test.ts'],
    // 不运行 Vue 组件测试，只测纯逻辑
    environment: 'node',
  },
})
