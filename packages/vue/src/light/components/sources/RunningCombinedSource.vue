<script lang="ts" setup>
import { computed, onBeforeMount, onUnmounted, PropType, ref, watch } from 'vue';
import {
    ComponentStatus,
    RunningLight,
    ValueItem,
    hasUIByArgumentConstraintWithUsingStatus,
    hasUIByArgumentConstraint,
} from '@mora-light/core/types/running';
import { ArgumentConstraint, DataSourceCombined } from '@mora-light/core/types/source';
import {
    assignRuntime,
    DataResult,
    deepClone,
    deleteRuntime,
    readRuntime,
    same,
    StringResult,
} from '@mora-light/core/types/common';
import RunningArgumentConstraintVue from './common/RunningArgumentConstraint.vue';
import { CandidValue } from '@mora-light/core/types/candid';

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
        type: Object as PropType<DataSourceCombined>,
        required: true,
    },
    triggerRefresh: {
        type: Number,
        required: true,
    },
});

const SOURCE_ID = props.runningLight.getNextSourceId();

const sourceRef = ref<HTMLElement>();

let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.values.innerValues];
let checkedOuterValues: ValueItem[] = [...props.values.outerValues];

const sourceId = ref(SOURCE_ID);
const argConstraint = ref<ArgumentConstraint>(props.initial.combined.arg);

let argConstraintResult: DataResult<ArgumentConstraint> = { ok: argConstraint.value };

const hasContentUI = computed(() => {
    return props.status === 'using'
        ? hasUIByArgumentConstraintWithUsingStatus(argConstraint.value)
        : hasUIByArgumentConstraint(argConstraint.value);
});

let initialed = false;
onBeforeMount(() => {
    props.runningLight.sources.init(
        props.parentSourceId,
        SOURCE_ID,
        props.initial.source,
        undefined,
    );
    init();
});
watch(
    () => [props.values, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    if (props.initial.source !== 'combined') return;

    const newCheckedCanExportValues = props.canExportValues;
    const newCheckedInnerValues = [...props.values.innerValues];
    const newCheckedOuterValues = [...props.values.outerValues];

    const newArgConstraint = props.initial.combined.arg;

    const newArgConstraintResult = { ok: newArgConstraint };

    if (
        initialed &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(argConstraint.value, newArgConstraint) &&
        same(argConstraintResult, newArgConstraintResult)
    ) {
        return;
    }

    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    argConstraint.value = newArgConstraint;

    argConstraintResult = newArgConstraintResult;

    // Record the current parameter status
    props.runningLight.sources.updateArg(
        SOURCE_ID,
        readRuntime(newArgConstraint) ?? { err: 'no runtime' },
    );
    props.runningLight.refreshSources(); // make a notification

    initialed = true;

    changed();
};

onUnmounted(() => {
    props.runningLight.sources.remove(props.parentSourceId, SOURCE_ID);
    props.runningLight.refreshSources(); // make a notification
});

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

        doCombinedTransform(runtimeResult); // Call for external buttons
    },
);

const doCombinedTransform = async (runtimeResult: StringResult<CandidValue> | undefined) => {
    // Determine whether dependencies are ready
    if (!props.runningLight.sources.isChildrenReady(SOURCE_ID)) {
        // console.error(`children not ready: ${SOURCE_ID}`);
        return;
    }

    const debug = false;
    if (debug) console.group('doCombinedTransform');

    // Whether the additional judgment parameters have to be called, etc.
    try {
        await (async () => {
            // 1. If there is no value, I will not continue
            if (runtimeResult === undefined) {
                if (debug) console.error('no runtime:', runtimeResult);
                props.runningLight.sources.updateArg(SOURCE_ID, { err: 'no runtime' });
                props.runningLight.refreshSources(); // make a notification
                return;
            }

            // 2. Record the current parameter status
            props.runningLight.sources.updateArg(SOURCE_ID, deepClone(runtimeResult));
            props.runningLight.refreshSources(); // make a notification

            // 3. If there is an error message, submit the error message directly
            if (runtimeResult.err !== undefined) {
                assignRuntime(props.initial.combined.from, runtimeResult);
                return;
            }

            // 4. If this result has been running, it will not continue // Maybe the same parameters want to call again
            // const old = props.initial.combined.from.runtime;
            // if (old !== undefined && same(old, runtimeResult)) {
            //     if (debug) console.error("executed:", old);
            //     return;
            // }

            // 5. If it is not triggered, you can’t go down
            if (props.runningLight.trigger) {
                if (debug) console.log('waiting trigger:', props.runningLight.trigger);
                assignRuntime(props.initial.combined.from, { err: props.runningLight.trigger });
                return;
            }

            const value = deepClone(runtimeResult.ok); // Copy

            if (debug) console.log('value:', value);

            // 6. The results obtained by returning processing
            assignRuntime(props.initial.combined.from, { ok: value });
        })();
    } catch (e) {
        console.log('doCombinedTransform', runtimeResult, e);
        assignRuntime(props.initial.combined.from, { err: `${e}` });
    }

    if (debug) console.groupEnd();

    changed();
};

const onArgConstraintChanged = (r: DataResult<ArgumentConstraint>) => {
    argConstraintResult = r;

    if (r.err !== undefined) {
        deleteRuntime(props.initial.combined.from); // Delete the running variable when there are errors
        changed();
        return;
    }

    argConstraint.value = r.ok;

    changed();

    const runtimeResult = deepClone(readRuntime<CandidValue>(r.ok));

    doCombinedTransform(runtimeResult); // Summary of the parameter modification
};

const produce = (): DataResult<DataSourceCombined> => {
    if (!initialed)
        return { err: { message: `${props.status} combined source has not been initial.` } };

    if (argConstraintResult.err !== undefined) return { err: argConstraintResult.err };

    const ok: DataSourceCombined = props.initial;

    ok.combined.arg = argConstraintResult.ok;

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<DataSourceCombined>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div
        class="running-combined-source-content"
        :class="{ 'margin-right': props.parentSourceId !== 0 }"
        ref="sourceRef"
    >
        <div
            class="combined-content"
            :class="{
                top: props.status !== 'using',
                'margin-bottom': hasContentUI,
            }"
        >
            <RunningArgumentConstraintVue
                :status="props.status"
                :parentSourceId="sourceId"
                :runningLight="props.runningLight"
                :values="props.values"
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
    </div>
</template>

<style lang="less" scoped>
.running-combined-source-content {
    @apply w-full flex flex-col justify-between items-start;
    &.margin-right {
        @apply mr-1 pr-1;
        border-right: 1px solid #ccc;
    }
    > .combined-content {
        @apply mt-1;
        &.top {
            @apply mt-0;
        }
        &.margin-bottom {
            @apply mb-2;
        }
        width: 100%;
    }
}
</style>
