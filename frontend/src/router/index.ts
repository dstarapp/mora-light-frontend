import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Home from '../views/home/Home.vue';
import Home2 from '../views/home/Home2.vue';
import Home3 from '../views/home/Home3.vue';
import Home4 from '../views/home/Home4.vue';

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'Home',
        component: Home,
        meta: {
            keepAlive: true,
        },
    },
    {
        path: '/anchor',
        name: 'Home2',
        component: Home2,
        meta: {
            keepAlive: true,
        },
    },
    {
        path: '/data',
        name: 'Home3',
        component: Home3,
        meta: {
            keepAlive: true,
        },
    },
    {
        path: '/constant/input',
        name: 'Home4',
        component: Home4,
        meta: {
            keepAlive: true,
        },
    },
    {
        path: '/:catchAll(.*)',
        redirect: '/',
    },
];

const router = createRouter({
    history: createWebHistory('/'),
    routes,
});

export default router;
