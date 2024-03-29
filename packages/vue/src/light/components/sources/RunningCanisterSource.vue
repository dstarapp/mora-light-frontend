<script lang="ts" setup>
import {
    computed,
    inject,
    onBeforeMount,
    onMounted,
    onUnmounted,
    PropType,
    Ref,
    ref,
    watch,
} from 'vue';
import {
    ComponentStatus,
    RunningLight,
    ValueItem,
    hasUIByArgumentConstraintWithUsingStatus,
    hasUIByArgumentConstraint,
    findInnerValueItemsByArgumentConstraint,
    findOuterValueItemsByArgumentConstraint,
    findInnerValueItemsByDataSource,
    findOuterValueItemsByDataSource,
    checkCanisterIdentity,
} from '@mora-light/core/types/running';
import {
    ArgumentConstraint,
    CanisterIdentity,
    CanisterIdSource,
    DataSource,
    DataSourceCanister,
} from '@mora-light/core/types/source';
import {
    assignRuntime,
    checkAndExecute,
    DataResult,
    deepClone,
    deleteRuntime,
    readRuntime,
    same,
    StringResult,
} from '@mora-light/core/types/common';
import {
    ActorIdentityRecord,
    CandidValue,
    readIdentityRuntime,
} from '@mora-light/core/types/candid';
import {
    CandidPrincipal,
    unwrapCandidValue,
    isSameCandidType,
    findAloneType,
    wrapCandidValue,
} from '@mora-light/core/types/candid';
import { HttpAgent } from '@dfinity/agent';
import RunningWrappedSourceVue from './RunningWrappedSource.vue';
import RunningArgumentConstraintVue from './common/RunningArgumentConstraint.vue';
import RunningCanisterIdentityVue from './canister/RunningCanisterIdentity.vue';

const checkCanisterId = (canister_id: CanisterIdSource): DataResult<string> => {
    if (canister_id.fixed) return { ok: canister_id.value };
    return { err: { message: `initial...` } };
};

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    parentSourceId: {
        type: Number,
        required: true,
    },
    runningLight: {
        type: Object as PropType<RunningLight>,
        required: true,
    },
    values: {
        type: Object as PropType<{
            outerValues: ValueItem[];
            propValues: ValueItem[];
            innerValues: ValueItem[];
        }>,
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
    index: {
        type: Number,
        required: false, // Display serial number
    },
    initial: {
        type: Object as PropType<DataSourceCanister>,
        required: true,
    },
    triggerRefresh: {
        type: Number,
        required: true,
    },
});

const pushTimestampRecord = inject<(tip: string) => void>('TIMESTAMP_RECORDS_PUSH')!;

const hostAgent = inject<Ref<HttpAgent | undefined>>('HOST_AGENT')!;

const SOURCE_ID = props.runningLight.getNextSourceId();

const sourceRef = ref<HTMLElement>();
const identityRef = ref<HTMLElement>();

let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.values.innerValues];
let checkedOuterValues: ValueItem[] = [...props.values.outerValues];

const sourceId = ref(SOURCE_ID);
const canisterId = ref<string>(
    props.initial.canister.canister_id.fixed ? props.initial.canister.canister_id.value : '',
);
const argConstraint = ref<ArgumentConstraint>(props.initial.canister.arg);
const identity = ref<CanisterIdentity>(props.initial.canister.identity);

const argExportedInnerValues = computed(() => {
    const items = [...props.values.innerValues];

    if (!props.initial.canister.canister_id.fixed && props.initial.canister.canister_id.source) {
        const source = { ...props.initial.canister.canister_id.source }; // Construct a temporary data copy

        findInnerValueItemsByDataSource(source, { propValues: props.values.propValues }, items);
    }

    return items;
});
const argExportedOuterValues = computed(() => {
    const items = [...props.values.outerValues];

    if (!props.initial.canister.canister_id.fixed && props.initial.canister.canister_id.source) {
        const source = { ...props.initial.canister.canister_id.source }; // Construct a temporary data copy

        findOuterValueItemsByDataSource(
            source,
            { propValues: props.values.propValues, innerValues: [...argExportedInnerValues.value] },
            items,
        );
    }

    return items;
});

const identityExportedInnerValues = computed(() => {
    const items = [...argExportedInnerValues.value];

    const argument = { ...argConstraint.value }; // Construct a temporary data copy

    findInnerValueItemsByArgumentConstraint(
        argument,
        { propValues: props.values.propValues },
        items,
    );

    return items;
});
const identityExportedOuterValues = computed(() => {
    const items = [...argExportedOuterValues.value];

    const argument = { ...argConstraint.value }; // Construct a temporary data copy

    findOuterValueItemsByArgumentConstraint(
        argument,
        {
            propValues: props.values.propValues,
            innerValues: [...identityExportedInnerValues.value],
        },
        items,
    );

    return items;
});

let canisterIdResult: DataResult<string> = checkCanisterId(props.initial.canister.canister_id);
let argConstraintResult: DataResult<ArgumentConstraint> = { ok: argConstraint.value };
let identityResult: DataResult<CanisterIdentity> = checkCanisterIdentity(
    identity.value,
    props.canExportValues,
    {
        outerValues: [...identityExportedOuterValues.value],
        propValues: props.values.propValues,
        innerValues: [...identityExportedInnerValues.value],
    },
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
    props.runningLight.sources.init(
        props.parentSourceId,
        SOURCE_ID,
        props.initial.source,
        cleanCanisterCall,
    );
    props.runningLight.canisters.add(SOURCE_ID);
    init();
});
onMounted(() => {
    props.runningLight.sources.updateEl(SOURCE_ID, sourceRef.value!);
});
watch(
    () => [props.values, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    if (props.initial.source !== 'canister') return;

    const newCheckedCanExportValues = props.canExportValues;
    const newCheckedInnerValues = [...props.values.innerValues];
    const newCheckedOuterValues = [...props.values.outerValues];

    const newCanisterId = props.initial.canister.canister_id.fixed
        ? props.initial.canister.canister_id.value
        : '';
    const newArgConstraint = props.initial.canister.arg;
    const newIdentity = props.initial.canister.identity;

    const newCanisterIdResult = checkCanisterId(props.initial.canister.canister_id);
    const newArgConstraintResult = { ok: newArgConstraint };
    let newIdentityResult = checkCanisterIdentity(
        newIdentity,
        newCheckedCanExportValues,
        {
            outerValues: [...identityExportedOuterValues.value],
            propValues: props.values.propValues,
            innerValues: [...identityExportedInnerValues.value],
        },
        identityRef.value,
    ).result;
    if (
        newIdentityResult.ok &&
        props.initial.canister.identity.from === 'host-login' &&
        !hostAgent.value
    ) {
        newIdentityResult = { err: { message: 'Identity is missing.', el: identityRef.value } };
    }

    if (
        initialed &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(canisterId.value, newCanisterId) &&
        same(argConstraint.value, newArgConstraint) &&
        same(identity.value, newIdentity) &&
        same(canisterIdResult, newCanisterIdResult) &&
        same(argConstraintResult, newArgConstraintResult) &&
        same(identityResult, newIdentityResult)
    ) {
        return;
    }

    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    canisterId.value = newCanisterId;
    argConstraint.value = newArgConstraint;
    identity.value = newIdentity;

    canisterIdResult = newCanisterIdResult;
    argConstraintResult = newArgConstraintResult;
    identityResult = newIdentityResult;

    // Record the current parameter status
    props.runningLight.sources.updateCanisterId(
        SOURCE_ID,
        canisterIdResult.err ? { err: canisterIdResult.err.message } : { ok: canisterIdResult.ok },
    );
    props.runningLight.sources.updateArg(
        SOURCE_ID,
        readRuntime(newArgConstraint) ?? { err: 'no runtime' },
    );
    props.runningLight.sources.updateIdentity(
        SOURCE_ID,
        identityResult.err ? { err: identityResult.err.message } : { ok: identityResult.ok },
    );
    props.runningLight.refreshSources(); // make a notification

    initialed = true;

    changed();
};

onUnmounted(() => {
    props.runningLight.sources.remove(props.parentSourceId, SOURCE_ID);
    props.runningLight.canisters.delete(SOURCE_ID);
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

        const runtimeResult = deepClone(readRuntime<CandidValue>(argConstraint.value));

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
    // console.error(
    //     `xxxx doCanisterCall [${SOURCE_ID}] actor: ${props.initial.canister.method.name}`,
    // );
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
    if (props.runningLight.calling > 4) {
        // Canister is called, it is delayed to trigger
        delayCanisterCallId = Number(setTimeout(() => doCanisterCall(runtimeResult), 33));
        return;
    }
    lastCanisterCall = now; // Record time, call directly this time

    const debug = true;
    if (debug)
        console.group(`doCanisterCall [${SOURCE_ID}] actor: ${props.initial.canister.method.name}`);

    props.runningLight.calling++;
    // Whether the additional judgment parameters have to be called, etc.
    try {
        await (async () => {
            // 1. If there is no value, I will not continue
            if (runtimeResult === undefined) {
                if (debug) console.error('no runtime:', runtimeResult);
                props.runningLight.sources.updateArg(SOURCE_ID, { err: 'no runtime' });
                props.runningLight.refreshSources(); // make a notification
                deleteRuntime(props.initial.canister.method.result); // Delete the running variable when there are errors
                return;
            }

            // 2. Record the current parameter status
            props.runningLight.sources.updateArg(SOURCE_ID, deepClone(runtimeResult));
            props.runningLight.refreshSources(); // make a notification

            // 3. If there is an error message, submit the error message directly
            if (runtimeResult.err !== undefined) {
                assignRuntime(props.initial.canister.method.result, runtimeResult);
                return;
            }

            // 4. check canister id
            // console.error('canister id result', canisterIdResult, canisterId.value);
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
                if (debug)
                    console.log('waiting trigger:', props.runningLight.trigger, runtimeResult);
                assignRuntime(props.initial.canister.method.result, {
                    err: props.runningLight.trigger,
                });
                return;
            }
            if (!props.runningLight.canisters.hasTrigger(SOURCE_ID)) {
                if (debug)
                    console.log(
                        'already trigger: ',
                        readRuntime(props.initial.canister.method.result),
                        props.runningLight.calling,
                        runtimeResult,
                    );
                return;
            }

            // 7. Determine whether there is an available call identity Identity
            const identityRecordResult = ((): StringResult<ActorIdentityRecord> => {
                const identityRecordResults = readIdentityRuntime(props.initial.canister.identity);
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
                assignRuntime(props.initial.canister.method.result, identityRecordResult);
                return;
            }
            const identityRecord = identityRecordResult.ok;

            // 8. At this step, you can consider saving the results of this time to avoid repeated calls
            assignRuntime(props.initial.canister.method.arg, deepClone(runtimeResult)); // To save

            // 9. Let's try to call the Canister method to get online results
            const runtime = deepClone(runtimeResult.ok); // Copy
            const code = `data:text/javascript;charset=utf-8,${encodeURIComponent(
                props.initial.canister.candid.javascript,
            )}`;
            const candid = await eval(`import("${code}")`);
            const actor: any = await identityRecord.identity.create(
                candid.idlFactory,
                canisterId.value,
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
            // props.runningLight.calling++;
            props.runningLight.canisters.done(SOURCE_ID);
            props.runningLight.callingStates[SOURCE_ID] = {
                id: SOURCE_ID,
                canisterId: canisterId.value,
                method: props.initial.canister.method.name,
                start: new Date().getTime(),
            };
            props.runningLight.refreshCalling();
            const call_start = new Date().getTime();
            try {
                pushTimestampRecord(
                    `canister call ${SOURCE_ID} -> start -> ${canisterId.value}#${props.initial.canister.method.name}`,
                );
                unwrapped = await actor[props.initial.canister.method.name](...unwrapped);
            } catch (e: any) {
                identityRecord.records.push({ time, arg, result: { error: e } });
                props.runningLight.sources.updateResult(SOURCE_ID, { err: `${e}` });
                // props.runningLight.calling--;
                delete props.runningLight.callingStates[SOURCE_ID];
                props.runningLight.refreshCalling();
                throw e;
            } finally {
                const call_end = new Date().getTime();
                pushTimestampRecord(
                    `canister call ${SOURCE_ID} -> end -> ${canisterId.value}#${
                        props.initial.canister.method.name
                    } -> spend: ${call_end - call_start}ms`,
                );
            }
            identityRecord.records.push({ time, arg, result: { value: unwrapped } });
            props.runningLight.sources.updateResult(SOURCE_ID, { ok: unwrapped });
            // props.runningLight.calling--;
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
                // ! Inexplicable, multiple returned parameters are returned to the array, and the single ones are directly worth it. Here
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
            assignRuntime(props.initial.canister.method.result, { ok: value });
        })();
        props.runningLight.calling--;
        props.runningLight.refreshCalling();
    } catch (e) {
        console.error('doCanisterCall failed', runtimeResult, e);
        assignRuntime(props.initial.canister.method.result, { err: `${e}` });
        props.runningLight.calling--;
        props.runningLight.refreshCalling();
    }

    if (debug) console.groupEnd();

    changed();
};

const onCanisterIdChanged = (r: DataResult<DataSource>) => {
    if (props.initial.canister.canister_id.fixed) return;

    // console.error('onCanisterIdChanged xxx', r);

    let rr: DataResult<string>;
    if (r.err) {
        rr = { err: r.err };
    } else {
        if (!r.ok.runtime) {
            rr = { err: { message: 'canister id can not be empty' } };
        } else if (r.ok.runtime.err) {
            rr = { err: { message: r.ok.runtime.err } };
        } else {
            rr = { ok: (r.ok.runtime.ok as CandidPrincipal).value };
        }
    }

    // console.error('onCanisterIdChanged', rr);

    canisterIdResult = rr;

    if (rr.ok !== undefined) canisterId.value = rr.ok;

    if (rr.err !== undefined) {
        props.runningLight.sources.updateCanisterId(SOURCE_ID, { err: rr.err.message });
    } else {
        props.runningLight.sources.updateCanisterId(SOURCE_ID, { ok: rr.ok });
    }
    props.runningLight.refreshSources();

    changed();

    if (canisterIdResult.err !== undefined) return;
    if (argConstraintResult.err !== undefined) return;

    doCanisterCall(readRuntime(argConstraintResult.ok));
};

const onArgConstraintChanged = (r: DataResult<ArgumentConstraint>) => {
    argConstraintResult = r;

    // console.error('canister source onArgConstraintChanged', r);

    if (r.err !== undefined) {
        deleteRuntime(props.initial.canister.method.result); // Delete the running variable when there are errors
        lastArgConstraint = undefined;
        changed();
        return;
    }

    argConstraint.value = r.ok;

    changed();

    if (same(lastArgConstraint, r.ok)) return; // It seems that there are no many calls
    lastArgConstraint = deepClone(r.ok); // Copy and record

    const runtimeResult = deepClone(readRuntime<CandidValue>(r.ok));

    doCanisterCall(runtimeResult); // Summary of the parameter modification
};

const onIdentityChanged = (r: DataResult<CanisterIdentity>) => {
    identityResult = r;

    // console.error(`onIdentityChanged [${SOURCE_ID}] `, r);

    if (r.err !== undefined) {
        props.runningLight.sources.updateIdentity(SOURCE_ID, { err: r.err.message });
    } else {
        props.runningLight.sources.updateIdentity(SOURCE_ID, { ok: r.ok });
    }
    props.runningLight.refreshSources();

    if (r.err !== undefined) {
        deleteRuntime(props.initial.canister.method.result); // Delete the running variable when there are errors
        lastArgConstraint = undefined;
        changed();
        return;
    }

    identity.value = r.ok;

    changed();

    if (canisterIdResult.err !== undefined) return;
    if (argConstraintResult.err !== undefined) return;

    // doCanisterCall(readRuntime(argConstraintResult.ok));
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
        class="running-canister-source-content"
        :class="{ 'margin-right': props.parentSourceId !== 0 }"
        ref="sourceRef"
    >
        <!-- <span class="method-name"> Canister Call: {{ props.initial.canister }} </span> -->
        <div class="canister-id">
            <template
                v-if="
                    !props.initial.canister.canister_id.fixed &&
                    props.initial.canister.canister_id.source
                "
            >
                <RunningWrappedSourceVue
                    :status="props.status"
                    :parentSourceId="props.parentSourceId"
                    :runningLight="props.runningLight"
                    :values="props.values"
                    :calling="props.calling"
                    :canExportValues="props.canExportValues"
                    :index="props.index"
                    :initial="props.initial.canister.canister_id.source"
                    :triggerRefresh="props.triggerRefresh"
                    @changed="onCanisterIdChanged"
                    ref="hasRef"
                    :canister-id-source="props.initial.canister.canister_id.source.source"
                />
            </template>
        </div>
        <div
            class="canister-content"
            :class="{
                top: props.status !== 'using',
                'margin-bottom': hasContentUI && hasIdentityUI,
            }"
        >
            <RunningArgumentConstraintVue
                :status="props.status"
                :parentSourceId="sourceId"
                :runningLight="props.runningLight"
                :values="{
                    outerValues: argExportedOuterValues,
                    propValues: props.values.propValues,
                    innerValues: argExportedInnerValues,
                }"
                :calling="props.calling"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :recItems="[]"
                :initial="argConstraint"
                :hasLabel="true"
                :triggerRefresh="props.triggerRefresh"
                @changed="onArgConstraintChanged"
            />
        </div>
        <div class="canister-identity">
            <!-- {{ props.runningLight }} -->
            <RunningCanisterIdentityVue
                :status="props.status"
                :runningLight="props.runningLight"
                :values="{
                    outerValues: identityExportedOuterValues,
                    propValues: props.values.propValues,
                    innerValues: identityExportedInnerValues,
                }"
                :calling="props.calling"
                :initial="identity"
                :canister_id="canisterId"
                :method="props.initial.canister.method.name"
                @changed="onIdentityChanged"
                ref="identityRef"
            />
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-canister-source-content {
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
