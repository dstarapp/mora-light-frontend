import { IDL } from '@dfinity/candid';
import { Actor, ActorSubclass, HttpAgent } from '@dfinity/agent';
import { StringResult } from '../../common';

// import { IC } from '@astrox/sdk-web';

export type IdentitySource = 'host' | 'anonymous' | 'internet-identity' | 'plug' | 'astrox-me';

export type ActorCreator = <T>(
    idlFactory: IDL.InterfaceFactory,
    canisterId: string,
) => Promise<ActorSubclass<T>>;

// single identity
export type ActorIdentity = {
    source: IdentitySource;
    principal: string;
    create: ActorCreator;
};

// Identity and call records
export type ActorIdentityRecord = {
    identity: ActorIdentity;
    records: {
        time: number; // Timestamp of the call
        arg: any; // Execution Parameter
        result:
            | {
                  value: any; // Execution Result
                  error?: undefined;
              }
            | {
                  value?: undefined;
                  error: any; // If an error occurs, record the error message
              };
    }[];
};

// Anonymous
export const getActorCreatorByAnonymous = (): ActorCreator => {
    const agent = new HttpAgent({
        host: 'https://boundary.ic0.app/', // Cross the line interface by default
    });
    return async (idlFactory: IDL.InterfaceFactory, canisterId: string) => {
        return Actor.createActor(idlFactory, { agent, canisterId });
    };
};

// Internet Identity Agent
export const getActorCreatorByAgent = (agent: HttpAgent): ActorCreator => {
    return async (idlFactory: IDL.InterfaceFactory, canisterId: string) => {
        return Actor.createActor(idlFactory, { agent, canisterId });
    };
};

// Plug's interface type
export interface PlugInterface {
    isConnected: () => Promise<boolean>;
    requestConnect: (_?: {
        whitelist?: string[]; // ['canister-id'],
        host?: string; // 'https://network-address',
        onConnectionUpdate?: () => void;
        timeout?: number; // Nils of millisecond default for 2 minutes
    }) => Promise<void>;
    sessionManager: {
        sessionData: {
            principalId: string;
            accountId: string;
            agent: HttpAgent;
        };
        onConnectionUpdate: () => void;
    };

    principalId?: string;
    accountId?: string;
    agent?: HttpAgent;
    createActor: <T>(_: {
        canisterId: string;
        interfaceFactory: IDL.InterfaceFactory;
    }) => Promise<ActorSubclass<T>>;
}

// Plug provides plug
export const getActorCreatorByPlug = (plug: PlugInterface): ActorCreator => {
    return async (idlFactory: IDL.InterfaceFactory, canisterId: string) => {
        return await plug.createActor({
            canisterId,
            interfaceFactory: idlFactory,
        });
    };
};

// Astrox me provides IC
export const getActorCreatorByIC = (ic: any): ActorCreator => {
    const identity = ic.identity;
    const agent = new HttpAgent({
        host: 'https://boundary.ic0.app/', // Cross the line interface by default line interface by default
        identity: identity as any,
    });
    return async (idlFactory: IDL.InterfaceFactory, canisterId: string) => {
        return Actor.createActor(idlFactory, { agent, canisterId });
    };
    // return async (idlFactory: InterfaceFactory, canisterId: string) => {
    //     return await ic.createActor(idlFactory, canisterId);
    // };
};

// Connect2IC provided ActiveProvider
export const getActorCreatorByActiveProvider = (activeProvider: any): ActorCreator => {
    return async (idlFactory: IDL.InterfaceFactory, canisterId: string) => {
        const { value: actor } = await activeProvider.createActor(canisterId, idlFactory);
        return actor;
    };
};

// =============================== identity ===============================

export const assignIdentityRuntime = (
    value: any,
    runtime: (StringResult<ActorIdentityRecord> | undefined)[] | undefined,
) => {
    if (typeof value === 'object') {
        if (runtime !== undefined) {
            value.runtime = runtime;
        } else {
            delete value.runtime;
        }
    }
};

export const readIdentityRuntime = (
    value: any,
): (StringResult<ActorIdentityRecord> | undefined)[] | undefined => {
    if (typeof value === 'object') {
        return value.runtime;
    }
    return undefined;
};

export const assureIdentityRuntime = (
    value: any,
    runtime: (StringResult<ActorIdentityRecord> | undefined)[],
) => {
    if (typeof value === 'object') {
        if (value.runtime === undefined) {
            return (value.runtime = runtime);
        }
    }
};
