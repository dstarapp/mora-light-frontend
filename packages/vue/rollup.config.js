import commonjs from '@rollup/plugin-commonjs'; // Convert CommonJS modules to ES6
import json from '@rollup/plugin-json'; // Convert .json files to ES6 modules
import terser from '@rollup/plugin-terser'; //Generate a minified output bundle with terser
// import typescript from '@rollup/plugin-typescript'; // Integration between Rollup and Typescript
import image from '@rollup/plugin-image';

// import less from 'rollup-plugin-less';
import postcss from 'rollup-plugin-postcss'; // Seamless integration between Rollup and PostCSS.
import typescript from 'rollup-plugin-typescript2'; // Rollup plugin for typescript with compiler errors.
import bundleSize from 'rollup-plugin-bundle-size'; // A rollup plugin to show the size of the generated bundle
import vue from 'rollup-plugin-vue'; // Roll Vue 3 SFCs with Rollup
import WindiCSS from 'rollup-plugin-windicss';
import copy from '@guanghechen/rollup-plugin-copy';

import pkg from './package.json' assert { type: 'json' };

const production = !process.env.ROLLUP_WATCH;

export default {
    input: 'src/index.ts',
    output: [
        {
            file: pkg.module,
            sourcemap: true,
            format: 'es',
            inlineDynamicImports: true,
            // external: ["vue"],
            globals: {
                vue: 'Vue',
            },
        },
        {
            file: pkg.main,
            sourcemap: true,
            format: 'cjs',
            inlineDynamicImports: true,
            // external: ["vue"],
            globals: {
                vue: 'Vue',
            },
        },
    ],
    plugins: [
        ...WindiCSS(),
        copy({
            targets: [{ src: 'src/assets/iconfont', dest: 'dist/public' }],
        }),
        image(),
        vue({
            // css: true,
            // compileTemplate: true,
        }),
        typescript(),
        commonjs(),
        // less(),
        json(),
        postcss({
            minimize: true,
            // extract: true,
            extract: 'index.css',
        }),
        production && terser(),
        production && bundleSize(),
    ],
    external: ['Vue'],
    // globals: {
    //   vue: "Vue",
    // },
};
