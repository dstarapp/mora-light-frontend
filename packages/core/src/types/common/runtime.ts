import { StringResult } from './results';

export const deleteRuntime = (value: any) => {
    if (typeof value === 'object') {
        delete value.runtime;
    }
};

export const assignRuntime = <T>(value: any, runtime: StringResult<T> | undefined) => {
    if (typeof value === 'object') {
        if (runtime !== undefined) {
            value.runtime = runtime;
        } else {
            delete value.runtime;
        }
    }
};

export const readRuntime = <T>(value: any): StringResult<T> | undefined => {
    if (typeof value === 'object') {
        return value.runtime;
    }
    return undefined;
};

export const assureRuntime = (value: any, runtime: any) => {
    if (typeof value === 'object') {
        if (value.runtime === undefined) {
            return (value.runtime = runtime);
        }
    }
};
