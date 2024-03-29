import { ActorIdentity } from './custom/identity';

export * from './custom/identity';

// some supported custom type
export type SupportedCustomType =
    // canister call
    'identity';

// value
export type CustomValue = ActorIdentity;

// some custom type
export type CustomType = {
    type: SupportedCustomType;
};

export const CUSTOM_TYPE_LIST: SupportedCustomType[] = ['identity'];
