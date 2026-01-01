import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router' // 稍后我们会创建这个

// 样式引入
import './style.css'
import 'vant/lib/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router) 

app.mount('#app')