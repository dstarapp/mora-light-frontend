import { StringResult } from '../../common';
import saferEval from 'safer-eval';

// function transform
export type FunctionTransform = {
    type: 'function';
    // const transform = (data) => {
    //     let result = undefined;
    // * before user's code
    // ===================================================
    //     result = data; // user's code
    // ===================================================
    // * after user's code
    //     return result;
    // };
    code: string; // javascript code
};

// default code
export const DEFAULT_TRANSFORM_FUNCTION_CODE = `result = data;`;

export const doFunctionTransform = async (
    transform: FunctionTransform,
    value: any, // real value // * note: BigInt and Principal type
    running: boolean,
): Promise<StringResult<any>> => {
    let result: StringResult<any>;

    const debug = false;
    if (debug) console.group('do function transform');

    try {
        // ? eval
        // value = await doExecuteByEvalToModuleDirectly(transform, value, debug);
        // ? Function
        // value = await doExecuteByFunctionDirectly(transform, value, debug);
        // ? SaferEval
        // value = await doExecuteBySaferEvalDirectly(transform, value, debug);
        // ? SaferEval and Function most safe way
        value = await doExecuteBySaferEvalAndFunction(transform, value, debug, running);

        if (debug) console.log('result:', value);

        // value can not be undefined
        if (value === undefined)
            throw new Error(
                'The result of function transform can not be undefined. code: ' + transform.code,
            );

        // return result
        result = { ok: value }; // wrap value
    } catch (e) {
        console.error('doFunctionTransform failed', transform, value, running, e);
        result = { err: `${e}` }; // return error message
    }

    if (debug) console.groupEnd();

    return result;
};

// SaferEval and Function
// import 'xxx'; Cannot use import statement outside a module
// require('xxx'); require is not defined
// x document
// x window
// x global
// x globalThis
// x this
// x localStorage
// x sessionStorage
// x indexedDB
// x location
// x Function
// x eval
// x XMLHttpRequest
const doExecuteBySaferEvalAndFunction = async (
    transform: FunctionTransform,
    value: any,
    debug: boolean,
    running: boolean,
): Promise<any> => {
    // 1. inner code
    const inner = `
            let result = undefined;

            with(this) {
                ${transform.code}
            }

            return result;
        `;

    // 2. outer code
    const code = `((data) => {
        const mask = {};
        for (const p in this) mask[p] = undefined;

        mask['globalThis'] = undefined;

        mask['Function'] = undefined;
        mask['eval'] = undefined;
        mask['XMLHttpRequest'] = undefined;
        mask['import'] = undefined;
        mask['require'] = undefined;
        mask['JSON'] = { stringify: JSON.stringify, parse: JSON.parse };

        ${running ? "mask['console'] = undefined;" : ''}

        const func = new Function('data', \`${inner}\`);

        return func.call(mask, data);
    }).call({}, data)`;

    if (debug) console.log('code:', code);

    // 3. execute and get value
    value = saferEval(code, { data: value, Function: Function }); // ! warning: code is wrong, execute error

    return value;
};

// only SaferEval
// x document
// x window
// x global
// globalThis
// this
// x localStorage
// x sessionStorage
// x indexedDB
// x location
// x Function
// x eval
// XMLHttpRequest
const doExecuteBySaferEvalDirectly = async (
    transform: FunctionTransform,
    value: any,
    debug: boolean,
): Promise<any> => {
    // 1. code
    const code = `((data) => {
        let result = undefined;

        ${transform.code}

        return result;
    }).call({}, data)`;

    if (debug) console.log('code:', code);

    // 2. execute
    value = saferEval(code, { data: value }); // ! warning: code is wrong, execute error

    return value;
};

// only Function
// document
// window
// global
// globalThis
// x this
// localStorage
// sessionStorage
// indexedDB
// location
// Function
// eval
// XMLHttpRequest
const doExecuteByFunctionDirectly = async (
    transform: FunctionTransform,
    value: any,
    debug: boolean,
): Promise<any> => {
    // 1. code
    const func = new Function(
        'data', // function name
        `    let result = undefined;
    ${transform.code};
    return result;`,
    );

    if (debug) console.log('func:', func);

    // 2. execute and get value
    value = func.call({}, value); // ! warning: code is wrong, execute error

    return value;
};

// only eval
// document
// window
// global
// globalThis
// x this
// localStorage
// sessionStorage
// indexedDB
// location
// Function
// eval
// XMLHttpRequest
const doExecuteByEvalToModuleDirectly = async (
    transform: FunctionTransform,
    value: any,
    debug: boolean,
): Promise<any> => {
    // 1. code
    let code = `export const transform = (data) => {
        let result = undefined;
        ${transform.code}
        return result;
      };`;

    if (debug) console.log('code:', code);
    if (debug) console.log('value:', value);

    // 2. module
    code = `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
    const module = await eval(`import("${code}")`); // parse to js module // ! warning: code is wrong, can not be module

    if (debug) console.log('module:', module);

    // 3. execute and get value
    value = module.transform(value); // ! warning: code is wrong, execute error

    return value;
};
