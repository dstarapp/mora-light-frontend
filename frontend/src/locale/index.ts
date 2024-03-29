// import { createI18n } from 'vue-i18n';
import { createI18n } from 'vue-i18n/dist/vue-i18n.cjs.js';
import commonLanguages from './languages/common';
import { setHtmlPageLang } from './locales';

export class LanguageItem {
    title: string;
    payload: SupportedLocale;
    constructor(title: string, payload: SupportedLocale) {
        this.title = title;
        this.payload = payload;
    }
    static of(title: string, payload: SupportedLocale): LanguageItem {
        return new LanguageItem(title, payload);
    }
}

export enum SupportedLocale {
    en = 'en',
    zhCN = 'zh-CN',
}

export const languages = [
    LanguageItem.of('navbar.language.en', SupportedLocale.en),
    LanguageItem.of('navbar.language.zh-CN', SupportedLocale.zhCN),
];

export function findLocaleByString(locale: string): SupportedLocale {
    locale = locale.replace('-', '');
    for (const l in SupportedLocale) {
        if (l === locale) {
            return SupportedLocale[locale];
        }
    }
    console.error('can not find supported language: ' + locale);
    return SupportedLocale.en;
}

const messages = {};
function getModules() {
    const modules = import.meta.globEager('./languages/*.ts');
    const exists = {};
    for (const m in modules) {
        if (m.endsWith('common.ts')) continue;
        // console.log('m', m);
        const locale = m.replace('.ts', '').substring(12);
        exists[locale] = modules[m];
    }
    // console.log(exists);
    return exists;
}
const exists = getModules();
for (const locale in SupportedLocale) {
    const name = SupportedLocale[locale];
    if (!exists[name]) {
        console.error('lost language package: ' + name, exists);
    }
    messages[name] = { ...exists[name]['default'], ...commonLanguages };
}

// console.log('messages', messages);

const i18n = createI18n({
    locale: SupportedLocale.en,
    fallbackLocale: SupportedLocale.en,
    silentFallbackWarn: true,
    globalInjection: true,
    messages,
});

export default i18n;

export function changeLanguage(locale: SupportedLocale) {
    i18n.global.locale = locale;
    setHtmlPageLang(locale);
}

export function parseLanguage(key: string): string {
    const value = i18n.global.t(key);
    if (!value) {
        console.error(
            `can not find multi-language value for key '${key}' with ${i18n.global.locale} environment. Check it please.`,
        );
    }
    return value;
}

export function t(key: string): string {
    return parseLanguage(key);
}
