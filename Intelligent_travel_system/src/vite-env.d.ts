/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // 定义 vue 组件的类型，让 TS 知道 import 进来的是什么
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'vanta/dist/vanta.waves.min';