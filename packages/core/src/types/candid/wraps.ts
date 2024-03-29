import { StringResult, deepClone } from '../common';
import {
    BlobCandidType,
    BoolCandidType,
    CandidType,
    CandidTypeApiItem,
    CandidTypeSubitem,
    EmptyCandidType,
    Float32CandidType,
    Float64CandidType,
    FuncCandidType,
    Int16CandidType,
    Int32CandidType,
    Int64CandidType,
    Int8CandidType,
    IntCandidType,
    Nat16CandidType,
    Nat32CandidType,
    Nat64CandidType,
    Nat8CandidType,
    NatCandidType,
    NullCandidType,
    OptCandidType,
    PrincipalCandidType,
    ReservedCandidType,
    ServiceCandidType,
    SubRecCandidType,
    TextCandidType,
    TupleCandidType,
    UnknownCandidType,
    VecCandidType,
} from './candid';
import { isSameCandidType } from './common';

// candid type to string
export const unwrapCandidType = (type: CandidType): string => {
    const isAlphaBeta = (key: string): boolean => /^[a-zA-Z_][a-zA-Z_0-9]*$/.test(key);
    switch (type.type) {
        case 'bool':
        case 'nat':
        case 'int':
        case 'nat8':
        case 'nat16':
        case 'nat32':
        case 'nat64':
        case 'int8':
        case 'int16':
        case 'int32':
        case 'int64':
        case 'float32':
        case 'float64':
        case 'null':
        case 'text':
        case 'principal':
        case 'blob':
            return type.type;
        case 'vec':
        case 'opt':
            return `${type.type} ${unwrapCandidType(type.subtype)}`;
        case 'record':
        case 'variant':
            if (type.subitems.length === 0) return `${type.type} {}`;
            return `${type.type} { ${type.subitems
                .map((subitem) => {
                    let key = isAlphaBeta(subitem.key)
                        ? `${subitem.key}`
                        : `"${subitem.key.replaceAll('"', '\\"')}`;
                    return isSameCandidType(subitem.type, { type: 'null' })
                        ? key
                        : `${key}: ${unwrapCandidType(subitem.type)}`;
                })
                .join('; ')} }`;
        case 'tuple':
            if (type.subitems.length === 0) return `record {}`;
            return `record { ${type.subitems
                .map((subitem) => `${unwrapCandidType(subitem.type)}`)
                .join('; ')} }`;
        case 'rec':
            if (type.subtype === undefined) return `rec_${type.id}`;
            return `μrec_${type.id}.${unwrapCandidType(type.subtype)}`;
        case 'unknown':
        case 'empty':
        case 'reserved':
            return type.type;
        case 'func':
            return `(${type.argTypes.subitems
                .map((subitem) => unwrapCandidType(subitem.type))
                .join(', ')}) -> (${type.retTypes.subitems
                .map((subitem) => unwrapCandidType(subitem.type))
                .join(', ')})${type.annotations.length ? ' query' : ''}`;
        case 'service':
            if (type.apis.length === 0) return `service: {}`;
            return `service: { ${type.apis.map((api) => {
                if (isAlphaBeta(api.method)) {
                    return `${api.method}: ${unwrapCandidType(api.func)}`;
                } else {
                    return `"${api.method.replaceAll('"', '\\"')}": ${unwrapCandidType(api.func)}`;
                }
            })} }`;
    }
};

// string to candid type
// ! maybe there are bugs here
export const wrapCandidType = (text: string): StringResult<CandidType> => {
    try {
        // if (text === 'vec nat8') debugger;
        const { type, remained } = wrapCandidType0({ text, index: -1 });
        if (remained.text.length === 0) return { ok: type };
        throw new Error(`wrong type from position: ${remained.index} | ${remained.text}`);
    } catch (e: any) {
        console.error('wrapCandidType failed', text, e);
        return { err: e.message };
    }
};
const wrapCandidType0 = (data: {
    text: string;
    index: number;
}): {
    type: CandidType;
    remained: {
        text: string;
        index: number;
    };
} => {
    const EMPTY_CHAR = [' ', '\n', '\r'];
    const trimStart = (data: { text: string; index: number }): { text: string; index: number } => {
        let text = data.text;
        let index = data.index;
        while (text.length > 0 && EMPTY_CHAR.includes(text.charAt(0))) {
            index += 1;
            text = text.substring(1);
        }
        return { text, index };
    };
    // try to read a candid type

    // console.error('wrapCandidType0', data.text, data.index);

    // 1. trim first blanks
    data = trimStart(data);

    // 2. empty is wrong
    if (data.text.length === 0) {
        throw new Error(`wrong type from position: ${data.index} | ${data.text}`);
    }

    // 3. simple type
    const simpleType = (
        type: // simple type
        // basic type
        | BoolCandidType
            | NatCandidType
            | IntCandidType
            | Nat8CandidType
            | Nat16CandidType
            | Nat32CandidType
            | Nat64CandidType
            | Int8CandidType
            | Int16CandidType
            | Int32CandidType
            | Int64CandidType
            | Float32CandidType
            | Float64CandidType
            | NullCandidType
            | TextCandidType
            | PrincipalCandidType
            | BlobCandidType
            // special
            | UnknownCandidType
            | EmptyCandidType
            | ReservedCandidType,
    ):
        | {
              type: CandidType;
              remained: {
                  text: string;
                  index: number;
              };
          }
        | undefined => {
        if (data.text.startsWith(type.type)) {
            const text = data.text.substring(type.type.length);
            const index = data.index + type.type.length;
            const next = text.length === 0 ? '' : text.substring(0, 1);
            if (next === '' || EMPTY_CHAR.includes(next) || ['{', '(', ';', '}'].includes(next)) {
                let data = { text, index };
                data = trimStart(data);
                return { type, remained: data };
            }
        }
        return undefined;
    };

    let r:
        | {
              type: CandidType;
              remained: {
                  text: string;
                  index: number;
              };
          }
        | undefined
        | undefined = undefined;

    if ((r = simpleType({ type: 'bool' })) !== undefined) return r;
    if ((r = simpleType({ type: 'nat' })) !== undefined) return r;
    if ((r = simpleType({ type: 'int' })) !== undefined) return r;
    if ((r = simpleType({ type: 'nat8' })) !== undefined) return r;
    if ((r = simpleType({ type: 'nat16' })) !== undefined) return r;
    if ((r = simpleType({ type: 'nat32' })) !== undefined) return r;
    if ((r = simpleType({ type: 'nat64' })) !== undefined) return r;
    if ((r = simpleType({ type: 'int8' })) !== undefined) return r;
    if ((r = simpleType({ type: 'int16' })) !== undefined) return r;
    if ((r = simpleType({ type: 'int32' })) !== undefined) return r;
    if ((r = simpleType({ type: 'int64' })) !== undefined) return r;
    if ((r = simpleType({ type: 'float32' })) !== undefined) return r;
    if ((r = simpleType({ type: 'float64' })) !== undefined) return r;
    if ((r = simpleType({ type: 'null' })) !== undefined) return r;
    if ((r = simpleType({ type: 'text' })) !== undefined) return r;
    if ((r = simpleType({ type: 'principal' })) !== undefined) return r;
    if ((r = simpleType({ type: 'blob', subtype: { type: 'nat8' } })) !== undefined) return r;

    if ((r = simpleType({ type: 'unknown' })) !== undefined) return r;
    if ((r = simpleType({ type: 'empty' })) !== undefined) return r;
    if ((r = simpleType({ type: 'reserved' })) !== undefined) return r;

    // vec and opt have subtype
    if (data.text.startsWith('vec') || data.text.startsWith('opt')) {
        const main = data.text.substring(0, 3) as 'vec' | 'opt';
        const text = data.text.substring(main.length);
        const index = data.index + main.length;
        const next = text.length === 0 ? '' : text.substring(0, 1);
        if (next === ' ') {
            // next char must be blank
            let data = { text, index };
            data = trimStart(data);
            // try to read subtype
            let { type: subtype, remained } = wrapCandidType0(data);
            remained = trimStart(remained);
            const type: OptCandidType | VecCandidType = { type: main, subtype: subtype };
            return { type, remained };
        }
    }

    const readKey = (text: string): [string, number] => {
        if (text.length === 0) return ['', 0];
        const next = text.substring(0, 1);
        if (/^[a-zA-Z_]$/.test(next)) {
            let key = next;
            text = text.substring(1);
            while (true) {
                if (text.length === 0) return ['', 0];
                const next = text.substring(0, 1);
                if ([' ', ':', ';', '}'].includes(next)) break;
                key = key + next;
                text = text.substring(1);
            }
            return [key, key.length];
        } else if (next === '"') {
            let key = '';
            let count = 0;
            text = text.substring(1);
            while (true) {
                if (text.length === 0) return ['', 0];
                const next = text.substring(0, 1);
                if (next === '\\') {
                    const next2 = text.length >= 2 ? text.substring(1, 2) : '';
                    const CHARS = [
                        ['b', '\b'],
                        ['t', '\t'],
                        ['n', '\n'],
                        ['v', '\v'],
                        ['f', '\f'],
                        ['r', '\r'],
                        ['"', '"'],
                        ["'", "'"],
                        ['\\', '\\'],
                    ];
                    const item = CHARS.find((cs) => cs[0] === next2);
                    if (item !== undefined) {
                        key = key + item[1];
                        text = text.substring(2);
                        count += 2;
                        continue;
                    }
                    return ['', 0];
                }
                if (next === '"') {
                    text = text.substring(1);
                    return [key, count + 2];
                }
                key = key + next;
                count += 1;
                text = text.substring(1);
            }
        }
        return ['', 0];
    };

    // variant
    if (data.text.startsWith('variant')) {
        const main = data.text.substring(0, 7) as 'variant';
        const text = data.text.substring(main.length);
        const index = data.index + main.length;
        if (text.length) {
            // must has something
            let data = { text, index };
            data = trimStart(data);
            // next char must be {
            if (data.text.startsWith('{')) {
                data = { text: data.text.substring(1), index: data.index + 1 };

                // try to read subitem
                const subitems: CandidTypeSubitem[] = [];

                while (true) {
                    data = trimStart(data);
                    if (data.text.length === 0) break;
                    if (data.text.startsWith('}')) break;

                    const [key, length] = readKey(data.text);
                    if (key.length === 0) break;

                    let temp = { text: data.text.substring(length), index: data.index + length };

                    temp = trimStart(temp);
                    if (temp.text.startsWith('}')) {
                        subitems.push({ key, type: { type: 'null' } });
                        data = temp;
                        break;
                    }
                    if (temp.text.startsWith(';')) {
                        subitems.push({ key, type: { type: 'null' } });
                    } else {
                        if (!temp.text.startsWith(':')) break;
                        temp = { text: temp.text.substring(1), index: temp.index + 1 };
                        temp = trimStart(temp);
                        let { type, remained } = wrapCandidType0(temp);
                        subitems.push({ key, type });
                        temp = remained;
                    }

                    let remained = trimStart(temp);
                    if (remained.text.startsWith(';'))
                        remained = { text: remained.text.substring(1), index: remained.index + 1 };
                    data = remained;
                }

                if (data.text.startsWith('}')) {
                    const type = { type: main, subitems };
                    data = { text: data.text.substring(1), index: data.index + 1 };
                    data = trimStart(data);
                    return { type, remained: data };
                }
            }
        }
    }

    // record
    if (data.text.startsWith('record')) {
        const main = data.text.substring(0, 6) as 'record';
        const text = data.text.substring(main.length);
        const index = data.index + main.length;
        if (text.length) {
            // must has something
            let data = { text, index };
            data = trimStart(data);
            // next char must be {
            if (data.text.startsWith('{')) {
                data = { text: data.text.substring(1), index: data.index + 1 };

                // try to read subitem
                const subitems: CandidTypeSubitem[] = [];

                while (true) {
                    data = trimStart(data);
                    if (data.text.length === 0) break;
                    if (data.text.startsWith('}')) break;

                    const [key, length] = readKey(data.text);
                    if (key.length === 0) break;

                    let temp = { text: data.text.substring(length), index: data.index + length };

                    temp = trimStart(temp);
                    if (!temp.text.startsWith(':')) break;
                    temp = { text: temp.text.substring(1), index: temp.index + 1 };
                    temp = trimStart(temp);

                    let { type, remained } = wrapCandidType0(temp);
                    subitems.push({ key, type });

                    remained = trimStart(remained);
                    if (remained.text.startsWith(';'))
                        remained = { text: remained.text.substring(1), index: remained.index + 1 };
                    data = remained;
                }

                if (data.text.startsWith('}')) {
                    const type = { type: main, subitems };
                    data = { text: data.text.substring(1), index: data.index + 1 };
                    data = trimStart(data);
                    return { type, remained: data };
                }
            }
        }
    }

    // tuple
    if (data.text.startsWith('record') || data.text.startsWith('tuple')) {
        const main = data.text.substring(0, data.text.startsWith('record') ? 6 : 5) as
            | 'record'
            | 'tuple';
        const text = data.text.substring(main.length);
        const index = data.index + main.length;
        if (text.length) {
            // must has something
            let data = { text, index };
            data = trimStart(data);
            // next char must be {
            if (data.text.startsWith('{')) {
                data = { text: data.text.substring(1), index: data.index + 1 };

                // try to read subitem
                const subitems: CandidTypeSubitem[] = [];

                while (true) {
                    data = trimStart(data);
                    if (data.text.length === 0) break;
                    if (data.text.startsWith('}')) break;

                    let { type, remained } = wrapCandidType0(data);
                    subitems.push({ key: `_${subitems.length}_`, type });

                    remained = trimStart(remained);
                    if (remained.text.startsWith(';'))
                        remained = { text: remained.text.substring(1), index: remained.index + 1 };
                    data = remained;
                }

                if (data.text.startsWith('}')) {
                    const type: TupleCandidType = { type: 'tuple', subitems };
                    data = { text: data.text.substring(1), index: data.index + 1 };
                    data = trimStart(data);
                    return { type, remained: data };
                }
            }
        }
    }

    // rec
    if (/^μrec_\d+\./.test(data.text)) {
        // rec start
        let text = data.text.substring(5);
        let index = data.index + 5;
        const id = parseInt(text.substring(0, text.indexOf('.')));
        index = index + text.indexOf('.') + 1;
        text = text.substring(text.indexOf('.') + 1);

        let { type, remained } = wrapCandidType0({ text, index });
        remained = trimStart(remained);
        return {
            type: { type: 'rec', subtype: type, id },
            remained,
        };
    }
    if (/^rec_\d+/.test(data.text)) {
        // rec end
        let text = data.text.substring(4);
        let index = data.index + 4;

        let m = text.match(/^\d+/);
        if (m && m[0].length) {
            const id = parseInt(m[0]);
            text = text.substring(m[0].length);
            index = index + m[0].length;
            let remained = { text, index };
            remained = trimStart(remained);
            const type: SubRecCandidType = { type: 'rec', id };
            return { type, remained };
        }
    }

    // func
    const findFunc = (data: {
        text: string;
        index: number;
    }): { type: FuncCandidType; remained: { text: string; index: number } } | undefined => {
        if (data.text.startsWith('(')) {
            const readTuple = (
                text: string,
                index: number,
            ):
                | [
                      TupleCandidType,
                      {
                          text: string;
                          index: number;
                      },
                  ]
                | undefined => {
                if (!text.startsWith('(')) return undefined;

                text = text.substring(1);
                index = index + 1;

                let data = { text, index };

                const subitems: CandidTypeSubitem[] = [];

                while (true) {
                    data = trimStart(data);
                    if (data.text.length === 0) break;
                    if (data.text.startsWith(')')) break;

                    let { type, remained } = wrapCandidType0(data);
                    subitems.push({ key: `_${subitems.length}_`, type });

                    remained = trimStart(remained);
                    if (remained.text.startsWith(','))
                        remained = { text: remained.text.substring(1), index: remained.index + 1 };
                    data = remained;
                }

                if (data.text.startsWith(')')) {
                    const type: TupleCandidType = { type: 'tuple', subitems };
                    data = { text: data.text.substring(1), index: data.index + 1 };
                    data = trimStart(data);
                    return [type, data];
                }
            };

            const arg = readTuple(data.text, data.index);
            if (arg !== undefined) {
                const argTypes = arg[0];
                let data = arg[1];
                // must be ->
                if (data.text.startsWith('->')) {
                    data = {
                        text: data.text.substring(2),
                        index: data.index + 2,
                    };
                    data = trimStart(data);

                    const ret = readTuple(data.text, data.index);
                    if (ret !== undefined) {
                        const retTypes = ret[0];
                        let data = ret[1];
                        data = trimStart(data);

                        let annotations: [] | ['query'] = [];
                        if (data.text.startsWith('query')) {
                            annotations = ['query'];
                            data = {
                                text: data.text.substring(5),
                                index: data.index + 5,
                            };
                            data = trimStart(data);
                        }
                        const type: FuncCandidType = {
                            type: 'func',
                            annotations,
                            argTypes,
                            retTypes,
                        };
                        return { type, remained: data };
                    }
                }
            }
        }
        return undefined;
    };
    const func = findFunc({ ...data });
    if (func !== undefined) return func;

    // service
    if (data.text.startsWith('service')) {
        const text = data.text.substring(7);
        const index = data.index + 7;
        if (text.length) {
            let data = { text, index };
            data = trimStart(data);

            if (data.text.startsWith(':')) {
                const text = data.text.substring(1);
                const index = data.index + 1;
                data = { text, index };
                data = trimStart(data);

                if (data.text.startsWith('{')) {
                    data = { text: data.text.substring(1), index: data.index + 1 };

                    const apis: CandidTypeApiItem[] = [];

                    const findKey = (text: string): [string, number] => {
                        if (text.length === 0) return ['', 0];
                        const next = text.substring(0, 1);
                        if (/^[a-zA-Z_]$/.test(next)) {
                            let key = next;
                            text = text.substring(0, 1);
                            while (true) {
                                if (text.length === 0) return ['', 0];
                                const next = text.substring(0, 1);
                                if ([' ', ':'].includes(next)) break;
                                key = key + next;
                                text = text.substring(1);
                            }
                            return [key, key.length];
                        }
                        return ['', 0];
                    };

                    while (true) {
                        data = trimStart(data);
                        if (data.text.length === 0) break;
                        if (data.text.startsWith('}')) break;

                        const [key, length] = findKey(data.text);
                        if (key.length === 0) break;

                        let temp = {
                            text: data.text.substring(length),
                            index: data.index + length,
                        };

                        temp = trimStart(temp);
                        if (!temp.text.startsWith(':')) break;
                        temp = { text: temp.text.substring(1), index: temp.index + 1 };
                        temp = trimStart(temp);

                        const func = findFunc(temp);
                        if (func === undefined) break;
                        apis.push({ method: key, func: func.type });

                        let remained = trimStart(func.remained);
                        if (remained.text.startsWith(';'))
                            remained = {
                                text: remained.text.substring(1),
                                index: remained.index + 1,
                            };
                        data = remained;
                    }

                    if (data.text.startsWith('}')) {
                        const type: ServiceCandidType = { type: 'service', apis };
                        data = { text: data.text.substring(1), index: data.index + 1 };
                        data = trimStart(data);
                        return { type, remained: data };
                    }
                }
            }
        }
    }

    // can not read type
    throw new Error(`wrong type from position: ${data.index} | ${data.text}`);
};

// stringify candid type
export const stringifyCandidType = (type: CandidType): string => {
    const clean = (t: CandidType): CandidType => {
        switch (t.type) {
            case 'bool':
            case 'nat':
            case 'int':
            case 'nat8':
            case 'nat16':
            case 'nat32':
            case 'nat64':
            case 'int8':
            case 'int16':
            case 'int32':
            case 'int64':
            case 'float32':
            case 'float64':
            case 'null':
            case 'text':
            case 'principal':
                return { type: t.type };
            case 'blob':
                return { type: t.type, subtype: { type: 'nat8' } };
            case 'vec':
                return { type: t.type, subtype: clean(t.subtype) };
            case 'opt':
                return { type: t.type, subtype: clean(t.subtype) };
            case 'record':
                return {
                    type: t.type,
                    subitems: t.subitems.map((subitem) => {
                        return {
                            key: subitem.key,
                            type: clean(subitem.type),
                        };
                    }),
                };
            case 'variant':
                return {
                    type: t.type,
                    subitems: t.subitems.map((subitem) => {
                        return {
                            key: subitem.key,
                            type: clean(subitem.type),
                        };
                    }),
                };
            case 'tuple':
                return {
                    type: t.type,
                    subitems: t.subitems.map((subitem) => {
                        return {
                            key: subitem.key,
                            type: clean(subitem.type),
                        };
                    }),
                };
            case 'rec':
                return t.subtype !== undefined
                    ? { type: t.type, subtype: clean(t.subtype), id: t.id }
                    : { type: t.type, subtype: undefined, id: t.id };
            case 'unknown':
            case 'empty':
            case 'reserved':
                return { type: t.type };
            case 'func':
                return {
                    type: t.type,
                    annotations: [...t.annotations],
                    argTypes: clean(t.argTypes) as TupleCandidType,
                    retTypes: clean(t.retTypes) as TupleCandidType,
                };
            case 'service':
                return {
                    type: t.type,
                    apis: t.apis.map((api) => {
                        return {
                            method: api.method,
                            func: clean(api.func) as FuncCandidType,
                        };
                    }),
                };
        }
    };
    const t = clean(deepClone(type));
    return JSON.stringify(t);
};
