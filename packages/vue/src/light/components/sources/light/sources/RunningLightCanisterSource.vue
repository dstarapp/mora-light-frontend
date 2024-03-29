<script lang="ts" setup>
import { computed, onBeforeMount, onMounted, onUnmounted, PropType, ref, watch } from 'vue';
import { RunningStatus } from '../../../../../types/running/running';
import { RunningLight } from '../../../../../types/running/light';
import {
    ValueItem,
    findInnerValueItemsByArgumentConstraint,
    findOuterValueItemsByArgumentConstraint,
} from '../../../../../types/common/value';
import { CanisterIdentity, DataSourceCanister } from '../../../../../types/parts/sources/canister';
import { ArgumentConstraint } from '../../../../../types/parts/sources/arg';
import { checkCanisterIdentity } from '../../../../../types/common/check';
import { ActorIdentityRecord } from '../../../../../canisters/creator';
import {
    CandidValue,
    findAloneType,
    isSameCandidType,
    unwrapCandidValue,
    wrapCandidValue,
} from '../@mora-light/core/types/candid';
import {
    hasUIByArgumentConstraintWithUsingStatus,
    hasUIByArgumentConstraint,
} from '../../../../../types/running/ui';
import { checkAndExecute, DataResult, deepClone, same, StringResult } from '../../../../../common';
import RunningLightArgumentConstraintVue from './common/RunningLightArgumentConstraint.vue';
import RunningLightCanisterIdentityVue from './canister/RunningLightCanisterIdentity.vue';

const props = defineProps({
    argResult: {
        type: Object as PropType<StringResult<CandidValue>>,
        required: false,
    },
    triggerRefresh: {
        type: Number,
        required: true,
    },
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    index: {
        type: Number,
        required: false, // Display serial number
    },
    runningLight: {
        type: Object as PropType<RunningLight>,
        required: true,
    },
    parentSourceId: {
        type: Number,
        required: true,
    },
    calling: {
        type: Number,
        required: true,
    },
    canExportValues: {
        type: Boolean,
        required: true, // There is a state that has an export internal variable option, because the state that can only be determined during use or runtime is not exported
    },
    innerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true, // Need to query the exported internal variables, so what internal variables have been produced before the current node is introduced
    },
    outerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true, // Need to query the exported external variables, so what internal variables have been generated before the current node is introduced
    },
    initial: {
        type: Object as PropType<DataSourceCanister>,
        required: true,
    },
});

const SOURCE_ID = props.runningLight.getNextSourceId();

const sourceRef = ref<HTMLElement>();
const identityRef = ref<HTMLElement>();

let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.innerValues];
let checkedOuterValues: ValueItem[] = [...props.outerValues];

const sourceId = ref(SOURCE_ID);
const argConstraint = ref<ArgumentConstraint>(props.initial.canister.arg);
const identity = ref<CanisterIdentity>(props.initial.canister.identity);

const identityExportedInnerValues = computed(() => {
    const items = [...props.innerValues];

    const argument = { ...argConstraint.value }; // Construct a temporary data copy

    findInnerValueItemsByArgumentConstraint(argument, items);

    return items;
});
const identityExportedOuterValues = computed(() => {
    const items = [...props.outerValues];

    const argument = { ...argConstraint.value }; // Construct a temporary data copy

    findOuterValueItemsByArgumentConstraint(argument, items, [
        ...identityExportedInnerValues.value,
    ]);

    return items;
});

let argConstraintResult: DataResult<ArgumentConstraint> = { ok: argConstraint.value };
let identityResult: DataResult<CanisterIdentity> = checkCanisterIdentity(
    identity.value,
    props.canExportValues,
    [...identityExportedInnerValues.value],
    [...identityExportedOuterValues.value],
    identityRef.value,
).result;

let lastArgConstraint: ArgumentConstraint | undefined = undefined; // Prevent multiple calls OK multiple times

// Limit the frequency of Canister call
const CANISTER_CALL_PERIOD = 1233; // Call the minimum cycle
let lastCanisterCall = 0;
let delayCanisterCallId = 0; // Delay call

const hasContentUI = computed(() => {
    return props.status === 'using'
        ? hasUIByArgumentConstraintWithUsingStatus(argConstraint.value)
        : hasUIByArgumentConstraint(argConstraint.value);
});

const hasIdentityUI = computed<boolean>(() => {
    switch (identity.value.from) {
        case 'anonymous':
            return props.status === 'using' || false;
        case 'host':
            return true;
        case 'login':
            return true;
        case 'host-login':
            return true;
        case 'inner':
            return props.status === 'using' || true;
        case 'outer':
            return props.status === 'using' || false;
    }
});

let initialed = false;
onBeforeMount(() => {
    props.runningLight.sources.init(props.parentSourceId, SOURCE_ID, cleanCanisterCall);
    init();
});
onMounted(() => props.runningLight.sources.updateEl(SOURCE_ID, sourceRef.value!));
watch(
    () => [props.innerValues, props.outerValues, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    if (props.initial.source !== 'canister') return;

    const newCheckedCanExportValues = props.canExportValues;
    const newCheckedInnerValues = [...props.innerValues];
    const newCheckedOuterValues = [...props.outerValues];

    const newArgConstraint = props.initial.canister.arg;
    const newIdentity = props.initial.canister.identity;

    const newArgConstraintResult = { ok: newArgConstraint };
    const newIdentityResult = checkCanisterIdentity(
        newIdentity,
        newCheckedCanExportValues,
        [...identityExportedInnerValues.value],
        [...identityExportedOuterValues.value],
        identityRef.value,
    ).result;

    if (
        initialed &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(argConstraint.value, newArgConstraint) &&
        same(identity.value, newIdentity) &&
        same(argConstraintResult, newArgConstraintResult) &&
        same(identityResult, newIdentityResult)
    ) {
        return;
    }

    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    argConstraint.value = newArgConstraint;
    identity.value = newIdentity;

    argConstraintResult = newArgConstraintResult;
    identityResult = newIdentityResult;

    // Record the current parameter status
    props.runningLight.sources.updateArg(
        SOURCE_ID,
        newArgConstraint.runtime ?? { err: 'no runtime' },
    );
    props.runningLight.refreshSources(); // make a notification

    initialed = true;

    changed();
};

onUnmounted(() => {
    props.runningLight.sources.remove(props.parentSourceId, SOURCE_ID);
    props.runningLight.refreshSources(); // make a notification
});

// After clearing the call information, it indicates that the canister call result is not available, so the export should also be reset
const cleanCanisterCall = () => {
    switch (props.initial.exported?.target) {
        case 'inner':
            props.runningLight.innerPool.pulse(props.initial.exported.name, undefined);
            break;
        case 'outer':
            props.runningLight.outerPool.pulse(props.initial.exported.name, undefined);
            break;
    }
};

watch(
    () => props.triggerRefresh,
    () => {
        // If it is wrong, it will not be triggered
        if (argConstraintResult.err !== undefined) return;

        const runtimeResult = deepClone(argConstraint.value.runtime);

        // if (runtimeResult === undefined) return;

        // console.error(
        //     'watch trigger refresh',
        //     SOURCE_ID,
        //     props.triggerRefresh,
        //     runtimeResult !== undefined ? JSON.stringify(runtimeResult) : undefined,
        // );

        doCanisterCall(runtimeResult); // Call for external buttons
    },
);

const doCanisterCall = async (runtimeResult: StringResult<CandidValue> | undefined) => {
    // Determine whether dependencies are ready
    if (!props.runningLight.sources.isChildrenReady(SOURCE_ID)) {
        // console.error(`children not ready: ${SOURCE_ID}`);
        return;
    }
    // Limit trigger frequency
    clearTimeout(delayCanisterCallId); // Close first
    const now = new Date().getTime();
    const diff = now - lastCanisterCall;
    if (diff < CANISTER_CALL_PERIOD) {
        // It's too frequent, to be delayed
        delayCanisterCallId = Number(
            setTimeout(() => doCanisterCall(runtimeResult), CANISTER_CALL_PERIOD - diff),
        );
        return;
    }
    if (props.runningLight.calling) {
        // Canister is called, it is delayed to trigger
        delayCanisterCallId = Number(setTimeout(() => doCanisterCall(runtimeResult), 33));
        return;
    }
    lastCanisterCall = now; // Record time, call directly this time

    const debug = true;
    if (debug)
        console.group(`doCanisterCall [${SOURCE_ID}] actor: ${props.initial.canister.method.name}`);

    // Whether the additional judgment parameters have to be called, etc.
    try {
        await (async () => {
            // 1. If there is no value, I will not continue
            if (runtimeResult === undefined) {
                if (debug) console.error('no runtime:', runtimeResult);
                props.runningLight.sources.updateArg(SOURCE_ID, { err: 'no runtime' });
                props.runningLight.refreshSources(); // make a notification
                delete props.initial.canister.method.result.runtime; // Delete the running variable when there are errors
                return;
            }

            // 2. Record the current parameter status
            props.runningLight.sources.updateArg(SOURCE_ID, deepClone(runtimeResult));
            props.runningLight.refreshSources(); // make a notification

            // 3. If there is an error message, submit the error message directly
            if (runtimeResult.err !== undefined) {
                props.initial.canister.method.result.runtime = runtimeResult;
                return;
            }

            // 4.
            if (canisterIdResult.err !== undefined) {
                if (debug) console.error('no canister id:', canisterIdResult);
                assignRuntime<CandidValue>(props.initial.canister.method.result, {
                    err: canisterIdResult.err.message,
                });
                return;
            }

            // 5. If this result has been running, it will not continue // Maybe the same parameters want to call again
            // const old = props.initial.canister.method.arg.runtime;
            // if (old !== undefined && same(old, runtimeResult)) {
            //     if (debug) console.error("executed:", old);
            //     return;
            // }

            // 6. If it is not triggered, you can’t go down
            if (props.runningLight.trigger) {
                if (debug) console.log('waiting trigger:', props.runningLight.trigger);
                props.initial.canister.method.result.runtime = { err: props.runningLight.trigger };
                return;
            }

            // 7. Determine whether there is an available call identity Identity
            const identityRecordResult = ((): StringResult<ActorIdentityRecord> => {
                const identityRecordResults = props.initial.canister.identity.runtime;
                if (identityRecordResults === undefined) return { err: 'login please' };
                const length = identityRecordResults.length;
                if (length === 0) return { err: 'login please' };
                const last = identityRecordResults[length - 1];
                if (last === undefined) return { err: 'login please' };
                return last;
            })();
            if (identityRecordResult.err !== undefined) {
                console.error('need identity:', props.initial.canister.identity);
                // No effective login information, just prompt
                props.initial.canister.method.result.runtime = identityRecordResult;
                return;
            }
            const identityRecord = identityRecordResult.ok;

            // 8. At this step, you can consider saving the results of this time to avoid repeated calls
            props.initial.canister.method.arg.runtime = deepClone(runtimeResult); // To save

            // 9. Let's try to call the Canister method to get online results
            const runtime = deepClone(runtimeResult.ok); // Copy
            const code = `data:text/javascript;charset=utf-8,${encodeURIComponent(
                props.initial.canister.candid.javascript,
            )}`;
            const candid = await eval(`import("${code}")`);
            const actor: any = await identityRecord.identity.create(
                candid.idlFactory,
                props.initial.canister.canister_id,
            ); // Get ACTOR

            if (debug) console.log('runtime:', runtime);

            // 10. Dismiss
            let unwrapped = unwrapCandidValue(
                props.initial.canister.method.arg,
                deepClone(runtime),
                [],
            );

            if (debug) console.log('unwrapped:', unwrapped);

            // 11. Performing method call
            const time = new Date().getTime();
            const arg = [...unwrapped];
            props.runningLight.calling++;
            props.runningLight.callingStates[SOURCE_ID] = {
                id: SOURCE_ID,
                canisterId: props.initial.canister.canister_id,
                method: props.initial.canister.method.name,
                start: new Date().getTime(),
            };
            props.runningLight.refreshCalling();
            try {
                unwrapped = await actor[props.initial.canister.method.name](...unwrapped);
            } catch (e: any) {
                identityRecord.records.push({ time, arg, result: { error: e } });
                props.runningLight.sources.updateResult(SOURCE_ID, { err: `${e}` });
                props.runningLight.calling--;
                delete props.runningLight.callingStates[SOURCE_ID];
                props.runningLight.refreshCalling();
                throw e;
            }
            identityRecord.records.push({ time, arg, result: { value: unwrapped } });
            props.runningLight.sources.updateResult(SOURCE_ID, { ok: unwrapped });
            props.runningLight.calling--;
            delete props.runningLight.callingStates[SOURCE_ID];
            props.runningLight.refreshCalling();

            if (debug) console.log('result:', unwrapped);

            // 12. Determine whether to modify the result value
            if (
                isSameCandidType(props.initial.canister.method.result, {
                    type: 'tuple',
                    subitems: [],
                })
            ) {
                if (unwrapped !== undefined) {
                    throw new Error('result is empty tuple, must be undefined');
                }
                unwrapped = []; // Need to convert undefined into a blank list
                if (debug) console.log('result2:', unwrapped);
            } else if (findAloneType(props.initial.canister.method.result).child > 0) {
                // ! Inexplicable, multiple returned parameters are returned to an array, and the single ones are directly worth it. Here is Package
                unwrapped = [unwrapped];
                if (debug) console.log('result2:', unwrapped);
            }

            // 13. Pack
            const value = wrapCandidValue(
                props.initial.canister.method.result,
                deepClone(unwrapped),
                [],
            );

            if (debug) console.log('value:', value);

            // 14. The results obtained by returning processing
            props.initial.canister.method.result.runtime = { ok: value };
        })();
    } catch (e) {
        console.error('doCanisterCall failed', runtimeResult, e);
        props.initial.canister.method.result.runtime = { err: `${e}` };
    }

    if (debug) console.groupEnd();

    changed();
};

const onArgConstraintChanged = (r: DataResult<ArgumentConstraint>) => {
    argConstraintResult = r;

    if (r.err !== undefined) {
        delete props.initial.canister.method.result.runtime; // Delete the running variable when there are errors
        lastArgConstraint = undefined;
        changed();
        return;
    }

    argConstraint.value = r.ok;

    changed();

    if (same(lastArgConstraint, r.ok)) return; // It seems that there are no many calls
    lastArgConstraint = deepClone(r.ok); // Copy and record

    const runtimeResult = deepClone(r.ok.runtime);

    doCanisterCall(runtimeResult); // Summary of the parameter modification
};

const onIdentityChanged = (r: DataResult<CanisterIdentity>) => {
    identityResult = r;

    if (r.err !== undefined) {
        delete props.initial.canister.method.result.runtime; // Delete the running variable when there are errors
        lastArgConstraint = undefined;
        changed();
        return;
    }

    identity.value = r.ok;

    changed();

    if (argConstraintResult.err !== undefined) return;

    doCanisterCall(argConstraintResult.ok.runtime);
};

const produce = (): DataResult<DataSourceCanister> => {
    if (!initialed)
        return { err: { message: `${props.status} canister source has not been initial.` } };

    if (argConstraintResult.err !== undefined) return { err: argConstraintResult.err };
    if (identityResult.err !== undefined) return { err: identityResult.err };

    const ok: DataSourceCanister = props.initial;

    ok.canister.arg = argConstraintResult.ok;

    ok.canister.identity = identityResult.ok;

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<DataSourceCanister>];
}>();

const changed = () =>
    checkAndExecute(!!identityRef.value, () => emit('changed', produce()), changed);
</script>

<template>
    <div
        class="running-light-canister-source-content"
        :class="{ 'margin-right': props.parentSourceId !== 0 }"
        ref="sourceRef"
    >
        <span class="method-name"> Canister Call: {{ props.initial.canister.method.name }} </span>
        <div
            class="canister-content"
            :class="{
                top: props.status !== 'using',
                'margin-bottom': hasContentUI && hasIdentityUI,
            }"
        >
            <RunningLightArgumentConstraintVue
                :argResult="props.argResult"
                :triggerRefresh="props.triggerRefresh"
                :status="props.status"
                :index="props.index"
                :runningLight="props.runningLight"
                :parentSourceId="sourceId"
                :calling="props.calling"
                :canExportValues="props.canExportValues"
                :innerValues="props.innerValues"
                :outerValues="props.outerValues"
                :hasLabel="true"
                :initial="argConstraint"
                @changed="onArgConstraintChanged"
            />
        </div>
        <div class="canister-identity">
            <RunningLightCanisterIdentityVue
                :status="props.status"
                :runningLight="props.runningLight"
                :calling="props.calling"
                :innerValues="identityExportedInnerValues"
                :outerValues="identityExportedOuterValues"
                :initial="identity"
                @changed="onIdentityChanged"
                ref="identityRef"
            />
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-light-canister-source-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    &.margin-right {
        margin-right: 5px;
        border-right: 1px solid #ccc;
        padding-right: 5px;
    }
    > .method-name {
        margin-top: 0px;
        font-size: 12px;
        opacity: 0.5;
    }
    > .canister-content {
        margin-top: 5px;
        &.top {
            margin-top: 0;
        }
        &.margin-bottom {
            margin-bottom: 10px;
        }
        width: 100%;
    }
    > .canister-identity {
        width: 100%;
    }
}
</style>
