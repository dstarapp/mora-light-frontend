import {
    CandidType,
    CandidValue,
    checkCandidValue,
    findChildTypeAndValue,
    stringifyCandidType,
    unwrapCandidType,
    unwrapCandidValue,
    wrapCandidValue,
} from '../candid';
import { StringResult, deepClone } from '../common';
import { FunctionTransform, doFunctionTransform } from './transforms/function';

// transform value
export type TransformValue = FunctionTransform;

// transform
export type Transform = {
    from: CandidType; // from type

    // if from type is alone, maybe find child value to transform
    child?: number;

    // if from's subitems has names for every subitem
    names?: string[];

    transform: TransformValue; // how to transform

    // to type
    to: CandidType;

    nested?: Transform; // nested transform，continue transform
};

export const findTransformToCandidType = (
    transform: Transform | undefined,
): CandidType | undefined => {
    if (transform === undefined) return undefined;
    if (transform.nested !== undefined) return findTransformToCandidType(transform.nested);
    return transform.to;
};

export const isValidVariableName = (name: string): boolean => {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
};

export const doTransform = async (
    transform: Transform | undefined,
    value: CandidValue,
    running: boolean,
): Promise<StringResult<CandidValue>> => {
    // return directly if transform is undefined
    if (transform === undefined) return { ok: value };

    let result: StringResult<CandidValue>;

    const debug = false;
    if (debug) console.group('do transform');

    try {
        if (debug) console.log('from:', transform.from);
        if (debug) console.log('value:', value);

        // 1. fetch child first
        let { type, value: child } = findChildTypeAndValue(value, transform.from, transform.child);

        if (debug) console.log('child type:', type);
        if (debug) console.log('child value:', child);

        // 2. unwrap
        let unwrapped: any = unwrapCandidValue(type, child, []);

        if (debug) console.log('unwrapped:', unwrapped);

        // 3. do transform
        switch (transform.transform.type) {
            case 'function':
                const functionResult = await doFunctionTransform(
                    ((): FunctionTransform => {
                        if (transform.names === undefined) return transform.transform;
                        // wrapped names
                        const innerVariables: string[] = [];
                        if (transform.child === 1 && transform.names.length === 1) {
                            const name = transform.names[0];
                            if (name && isValidVariableName(name)) {
                                innerVariables.push(`let ${name} = data;`);
                            }
                        } else {
                            for (let i = 0; i < transform.names.length; i++) {
                                const name = transform.names[i];
                                if (name && isValidVariableName(name)) {
                                    innerVariables.push(`let ${name} = data[${i}];`);
                                }
                            }
                        }

                        return {
                            type: 'function',
                            code: `${innerVariables.join('\n')}
                            result = ((data) => {
                                let result;
                                ${transform.transform.code}
                                return result;
                            })(data);`,
                        };
                    })(),
                    unwrapped,
                    running,
                );
                if (functionResult.err !== undefined) return { err: functionResult.err };
                unwrapped = functionResult.ok; // fetch value
                break;
            default:
                throw new Error('what a transform type? ' + transform.transform.type);
        }

        if (debug) console.log('transformed:', unwrapped);

        // 4. value can not be undefined
        if (unwrapped === undefined)
            throw new Error('The result of transform can not be undefined.');

        // 5. wrap
        value = wrapCandidValue(transform.to, unwrapped, []);

        if (debug) console.log('wrapped:', value);

        // 6. if there is nested transform, do it recursively.
        if (transform.nested !== undefined) {
            const nestedResult = await doTransform(transform.nested, value, running);
            if (nestedResult.err !== undefined) return { err: nestedResult.err };
            value = nestedResult.ok;
        }

        // 7. check result value and type
        value = deepClone(value); // copy
        if (!checkCandidValue(findTransformToCandidType(transform)!, value, [])) {
            result = {
                err: `wrong value ${JSON.stringify(value)} for type '${unwrapCandidType(
                    findTransformToCandidType(transform)!,
                )}'`,
            };
        } else {
            // 8. return value
            result = { ok: value }; // wrapped
        }
    } catch (e) {
        console.error('doTransform failed', transform, value, running, e);
        result = { err: `${e}` }; // error message
    }

    if (debug) console.groupEnd();

    return result;
};
