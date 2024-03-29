import { Principal } from '@dfinity/principal';

export const deepClone = <T>(value: T): T => {
    if (value === undefined) return undefined as T;
    if (value === null) return null as T;

    // copy data
    // 1. basic type
    switch (typeof value) {
        case 'boolean':
            return value as T;
        case 'bigint':
            return BigInt(`${value}`) as T;
        case 'number':
            return value as T;
        case 'string':
            return value as T;
        case 'object':
            // Principal
            if ((value as any)['_arr'] && (value as any)['_isPrincipal']) {
                return Principal.fromText((value as any).toText()) as T;
            }
            break;
        case 'function':
            // do nothing
            if (`${value}`.startsWith('async (idlFactory, canisterId) => {')) return value as T;
        default:
            console.error('can not clone value', value, typeof value);
            debugger;
            throw Error('can not clone value: ' + value);
    }

    // 2. special value
    if (
        !((value: any): boolean => {
            if (value === undefined) return true;
            if (value === null) return true;

            // const has = (value: any, keys: string[]): boolean => {
            //     for (let i = 0; i < keys.length; i++) {
            //         if (value[keys[i]] === undefined) return false;
            //     }
            //     return true;
            // };

            return true;
        })(value)
    )
        return value;

    // 3. Array
    if (Object.prototype.toString.call(value) === '[object Array]')
        return (value as any).map((v: any) => deepClone(v)) as T;

    // 4. Object
    const v: Record<string, any> = {};
    for (const key of Object.keys(value)) v[key] = deepClone((value as any)[key]);
    return v as T;

    // return JSON.parse(JSON.stringify(value)); // ! how to stringify Infinity or NaN of number
};
