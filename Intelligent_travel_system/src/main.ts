import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'vant/lib/index.css'
import App from './App.vue'
import router from './router'

// 1. 引入 Vant 核心库
import Vant from 'vant'

import './style.css'
import 'vant/lib/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 3. 注册 Vant 组件库
app.use(Vant) 

app.mount('#app')