import '@purge-icons/generated';
import { createApp } from 'vue';
import i18n from './locale';
import router from './router';
import store from './store';
import App from './App.vue';

import 'virtual:windi.css';

import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';


import './assets/less/element.less';

const app = createApp(App);
app.use(ElementPlus).use(i18n).use(router).use(store);

app.mount('#app');
