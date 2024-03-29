import { createStyleImportPlugin } from 'vite-plugin-style-import';

export function styleImportPlugin(isBuild: boolean) {
    if (!isBuild) return [];
    const styleImportPlugin = createStyleImportPlugin({
        libs: [
            {
                libraryName: 'element-plus',
                esModule: true,
                ensureStyleFile: true,
                resolveStyle: (name) => {
                    const cssName: string = name.slice(3);
                    return `element-plus/packages/theme-chalk/src/${cssName}.scss`;
                },
            },
        ],
        resolves: [
            {
                libraryName: 'element-plus',
                resolveStyle: (name) => `element-plus/lib/${name}`,
            },
        ],
    });
    return styleImportPlugin;
}
