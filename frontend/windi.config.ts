import { defineConfig } from 'vite-plugin-windicss';

export default defineConfig({
    extract: {
        include: [
            'src/**/*.{vue,html,jsx,tsx,ts,js}',
            '../packages/vue/src/**/*.{vue,html,jsx,tsx,ts,js}',
        ],
        exclude: ['node_modules', '.git'],
    },
    theme: {
        extend: {},
    },
    plugins: [],
    attributify: true,
});
