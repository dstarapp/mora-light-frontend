import type { PluginOption } from 'vite';

import { ViteEnv } from '../../../types/model';

import vue from '@vitejs/plugin-vue';
import { viteHtmlPlugins } from './html';
import { svgIconsPlugin } from './svgIcons';
import { styleImportPlugin } from './styleImport';
import { viteCompressionPlugin } from './compression';
import purgeIcons from 'vite-plugin-purge-icons';
import { visualizerPlugin } from './visualizer';
// import { viteThemePlugin } from './theme';
import { imageminPlugin } from './imagemin';
import { pwaPlugin } from './pwa';
// import { unpluginVueComponents } from './unpluginVueComponents';
import { legacyPlugin } from './legacy';

export function createVitePlugins(viteEnv: ViteEnv, isBuild: boolean) {
    const {
        VITE_BUILD_COMPRESS: compressType,
        VITE_BUILD_COMPRESS_DELETE_ORIGIN_FILE: shouldBuildCompressDeleteFile,
        VITE_USE_IMAGEMIN: shouldUseImagemin,
    } = viteEnv;

    const vitePlugins: (PluginOption | PluginOption[])[] = [];

    vitePlugins.push(vue());
    vitePlugins.push(...viteHtmlPlugins(viteEnv, isBuild));
    vitePlugins.push(svgIconsPlugin(isBuild));
    vitePlugins.push(styleImportPlugin(isBuild));
    vitePlugins.push(purgeIcons({}));
    vitePlugins.push(visualizerPlugin());
    // vitePlugins.push(viteThemePlugin())
    vitePlugins.push(legacyPlugin());
    // vitePlugins.push(impPlugin())
    // vitePlugins.push(unpluginVueComponents())

    if (isBuild) {
        vitePlugins.push(viteCompressionPlugin(compressType, shouldBuildCompressDeleteFile));
        shouldUseImagemin && vitePlugins.push(imageminPlugin());
        vitePlugins.push(pwaPlugin(viteEnv));
    }

    return vitePlugins;
}
