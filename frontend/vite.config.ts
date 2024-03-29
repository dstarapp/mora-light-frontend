import { defineConfig, loadEnv, UserConfig } from 'vite';
import * as path from 'path';

import { createVitePlugins } from './build/vite/plugins';
import { ViteEnv } from './types/model';
import WindiCSS from 'vite-plugin-windicss';

enum ConfigMode {
    development = 1,
    production,
}
// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
    console.log('command ->', command);
    console.log('mode ->', mode);

    const configMode = getConfigMode(mode);
    console.log('config mode ->', ConfigMode[configMode]);
    const readEnv = loadEnv(mode, './env');
    // @ts-ignore force transform, not a bit problem for string variable
    const viteEnv: ViteEnv = readEnv;
    // but matters other types
    if (readEnv.VITE_DROP_CONSOLE !== undefined)
        viteEnv.VITE_DROP_CONSOLE = readEnv.VITE_DROP_CONSOLE === 'true';
    if (readEnv.VITE_DROP_DEBUGGER !== undefined)
        viteEnv.VITE_DROP_DEBUGGER = readEnv.VITE_DROP_DEBUGGER === 'true';
    console.log('viteEnv ->', viteEnv);

    process.env.configMode = ConfigMode[configMode];

    mode = getMode(configMode);
    const isBuild = mode === 'production';
    const common: UserConfig = {
        publicDir: 'public',
        mode,
        define: {
            'process.env.NODE_ENV': JSON.stringify(getNodeEnv(configMode)),
            'process.env': process.env,
        },
        plugins: [WindiCSS(), ...createVitePlugins(viteEnv, isBuild)],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src'),
                '~/': `${path.resolve(__dirname, 'src')}/`,
                // "vue-i18n": "vue-i18n/dist/vue-i18n.cjs.js",
            },
            extensions: ['.js', '.ts', '.jsx', '.tsx', '.vue'],
        },
        build: {
            minify: isBuild ? 'esbuild' : false,
            // terserOptions: {
            //     compress: {
            //         drop_console:
            //             configMode == ConfigMode.production
            //                 ? true
            //                 : viteEnv.VITE_DROP_CONSOLE === undefined
            //                 ? isBuild
            //                 : viteEnv.VITE_DROP_CONSOLE,
            //         drop_debugger:
            //             configMode == ConfigMode.production
            //                 ? true
            //                 : viteEnv.VITE_DROP_DEBUGGER === undefined
            //                 ? isBuild
            //                 : viteEnv.VITE_DROP_DEBUGGER,
            //     },
            // },
            rollupOptions: {
                // external: ["element-plus"],
                output: {
                    manualChunks: {
                        vue: ['vue', 'vue-router', 'vuex'],
                        'element-plus': ['element-plus'],
                    },
                    // manualChunks(id) {
                    //     if (id.includes("node_modules")) {
                    //         return "vendor"
                    //     }
                    //     // if (
                    //     //     id.includes("node_modules") &&
                    //     //     id.match(/element-plus|legacy/)
                    //     // ) {
                    //     //     return id
                    //     //         .toString()
                    //     //         .split("node_modules/")[1]
                    //     //         .split("/")[0]
                    //     //         .toString()
                    //     // }
                    // },
                },
            },
        },
        css: {
            preprocessorOptions: {
                scss: {
                    charset: false,
                    // additionalData: `@use "~/assets/theme/element-variables.scss" as *;`,
                },
            },
        },
        envDir: 'env',
        clearScreen: false,
    };

    if (!isBuild) {
        return {
            ...common,
            server: {
                hmr: true,
                proxy: {
                    '/api': {
                        target: 'http://localhost',
                        changeOrigin: true,
                        rewrite: (path) => path,
                    },
                },
                cors: true,
                host: '0.0.0.0',
                port: 4000,
            },
        };
    } else {
        return {
            ...common,
        };
    }
});

function getConfigMode(mode: string): ConfigMode {
    if (ConfigMode[mode]) {
        return ConfigMode[mode];
    }
    throw new Error('can not recognize mode: ' + mode);
}

function getMode(configMode: ConfigMode) {
    let mode = '';
    switch (configMode) {
        case ConfigMode.development:
            mode = 'development';
            break;
        case ConfigMode.production:
            mode = 'production';
            break;
        default:
            throw new Error(`what a config config mode: ${configMode} ${ConfigMode[configMode]}`);
    }
    return mode;
}

function getNodeEnv(mode: ConfigMode): string {
    let env = '';
    switch (mode) {
        case ConfigMode.development:
            env = 'development';
            break;
        case ConfigMode.production:
            env = 'production';
            break;
        default:
            throw new Error(`what a config config mode: ${mode} ${ConfigMode[mode]}`);
    }
    return env;
}
