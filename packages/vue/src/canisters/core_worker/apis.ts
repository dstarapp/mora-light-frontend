import { Agent, Identity } from '@dfinity/agent';
import { createCoreWorkerActor } from './index';
import { LightExecutingQueryResult } from './core_worker.did.d';

const getActor = (canister_id: string, identity?: Identity) => {
    return createCoreWorkerActor(
        canister_id,
        identity ? { agentOptions: { identity } } : undefined,
    );
};

const getActorByAgent = (canister_id: string, agent: Agent) => {
    return createCoreWorkerActor(canister_id, {
        actorOptions: { agent },
    });
};

export const queryLightCoreData = async (
    canister_id: string,
    hash: string,
): Promise<LightExecutingQueryResult> => {
    const actor = getActor(canister_id);
    const result: LightExecutingQueryResult = await actor.executing_query(hash);
    return result;
};
