/**
 * https://github.com/anncwb/vite-plugin-theme
 */
import {
    viteThemePlugin as themePlugin,
    // mixLighten,
    // mixDarken,
    // tinycolor,
} from 'vite-plugin-theme';
// import { getThemeColors, generateColors } from "../../config/themeConfig"

export function viteThemePlugin() {
    // const colors = generateColors({
    //     mixDarken,
    //     mixLighten,
    //     tinycolor,
    // })

    const plugin = themePlugin({
        colorVariables: [
            // ...getThemeColors(), ...colors
        ],
    });
    return plugin;
}
