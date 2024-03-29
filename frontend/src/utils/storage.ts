export const setLocaleStorage = (locale: string): void => {
    localStorage.setItem('LANGUAGE_LOCALE', locale);
};

export const getLocaleStorage = (): string => {
    const locale = localStorage.getItem('LANGUAGE_LOCALE');
    return locale ? locale : 'en';
};
