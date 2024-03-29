export declare interface ViteEnv {
    VITE_KEYWORDS: string;
    VITE_AUTHOR: string;
    VITE_DESCRIPTION: string;
    VITE_NO_SCRIPT_TITLE: string;
    VITE_TITLE: string;

    VITE_DROP_CONSOLE?: boolean;
    VITE_DROP_DEBUGGER?: boolean;

    VITE_PORT: number;
    VITE_USE_MOCK: boolean;
    VITE_USE_PWA: boolean;
    VITE_PUBLIC_PATH: string;
    VITE_PROXY: [string, string][];
    VITE_GLOB_APP_TITLE: string;
    VITE_GLOB_APP_SHORT_NAME: string;
    VITE_USE_CDN: boolean;
    VITE_BUILD_COMPRESS: 'gzip' | 'brotli' | 'none';
    VITE_BUILD_COMPRESS_DELETE_ORIGIN_FILE: boolean;
    VITE_LEGACY?: boolean;
    VITE_USE_IMAGEMIN: boolean;
    VITE_GENERATE_UI: string;
    VITE_SHOW_DEBUG_SCRIPT: boolean;
}
