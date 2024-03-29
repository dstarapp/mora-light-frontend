import { DataSource } from './index';
import { CandidValue, CanisterText, TupleCandidType } from '../candid';
import { ExportedInfo, StringResult } from '../common';
import { Transform } from '../transform';
import { ArgumentConstraint } from './arg';

// data source 6 - canister call
export type DataSourceCanister = {
    source: 'canister'; // canister data source

    canister: {
        // which canister
        canister_id: CanisterIdSource;
        info: CanisterInfo;
        candid: CanisterCandid;
        method: CanisterMethod;
        arg: ArgumentConstraint; // argument constraint
        identity: CanisterIdentity; // canister call identity
    };

    // ? creating
    transform?: Transform; // maybe needs transform
    // ? creating
    exported?: ExportedInfo; // export type is this source's result type

    // ? running
    runtime?: StringResult<CandidValue>;
};

export type CanisterIdSource =
    | {
          fixed: true;
          value: CanisterText;
          source?: undefined;
      }
    | {
          fixed: false;
          value?: CanisterText; // for get candid content
          source: DataSource; // dynamic value
      };

export type CanisterInfo = {
    module_hash: string;
    updated: number; // last updated time
};

export type CanisterCandid = {
    custom: boolean; // local candid or not
    did: string; // candid content
    javascript: string; // parse to javascript
};

export type CanisterMethod = {
    name: string; // which method
    arg: TupleCandidType; // arguments
    result: TupleCandidType; // results
    child?: number; // abstract child value if result is alone type
};

// canister identity
export type CanisterIdentity =
    | CanisterIdentityAnonymous
    | CanisterIdentityHost
    | CanisterIdentityLogin
    | CanisterIdentityHostLogin
    | CanisterIdentityHostInner
    | CanisterIdentityHostOuter;
// canister identity from
export type CanisterIdentityFrom =
    | 'anonymous' // anonymous call
    | 'host' // use host identity
    | 'login' // user login // * can export
    | 'host-login' // use host identity of user login // * can export
    | 'inner' // use experted inner identity // * can export
    | 'outer'; // use experted outer identity
// anonymous call
export type CanisterIdentityAnonymous = {
    from: 'anonymous';
    name?: undefined;
    detail?: undefined;
    exported?: undefined;
};
// use host identity
export type CanisterIdentityHost = {
    from: 'host';
    name?: undefined;
    detail?: undefined;
    exported?: undefined;
};
// user login
export type CanisterIdentityLogin = {
    from: 'login';
    name?: undefined;
    detail?: undefined;
    exported?: ExportedInfo; // * can export
};
// use host identity of user login
export type CanisterIdentityHostLogin = {
    from: 'host-login';
    name?: undefined;
    detail?: undefined;
    exported?: ExportedInfo; // * can export
};
// use experted inner identity
export type CanisterIdentityHostInner = {
    from: 'inner';
    // ? creating
    name: string; // ! previous exported inner name
    detail: 'login' | 'host-login';
    exported?: ExportedInfo; // * can export
};
// use experted outer identity
export type CanisterIdentityHostOuter = {
    from: 'outer';
    // ? using
    using: string; // id for fetch data from prop
    name?: string; // ! previous exported outer name
    detail?: 'login' | 'host-login';
    exported?: undefined;
};

export const isCanisterIdentityHasExported = (from: CanisterIdentityFrom): boolean =>
    ['login', 'host-login', 'inner'].includes(from);
export const isCanisterIdentityImport = (from: CanisterIdentityFrom): boolean =>
    ['inner', 'outer'].includes(from);
