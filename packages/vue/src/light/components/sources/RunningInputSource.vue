<script lang="ts" setup>
import { onBeforeMount, onUnmounted, PropType, ref, watch } from 'vue';
import { ComponentStatus, RunningLight } from '@mora-light/core/types/running';
import { DataSourceInput } from '@mora-light/core/types/source';
import { CandidType, CandidValue } from '@mora-light/core/types/candid';
import { DataResult, deepClone, readRuntime, same } from '@mora-light/core/types/common';
import RunningInputCandidTypeVue from '../input/RunningInputCandidType.vue';

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
    index: {
        type: Number,
        required: false, // Display serial number
    },
    initial: {
        type: Object as PropType<DataSourceInput>,
        required: true,
    },
});

const SOURCE_ID = props.runningLight.getNextSourceId();

const inputResult = ref<CandidType>(props.initial.input.result);

let inputResultResult: DataResult<CandidType> = { ok: inputResult.value };

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
    () => [props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    if (props.initial.source !== 'input') return;

    const newInputResult = props.initial.input.result;

    const newInputResultResult = { ok: newInputResult };

    if (
        initialed &&
        same(inputResult.value, newInputResult) &&
        same(inputResultResult, newInputResultResult)
    ) {
        return;
    }

    inputResult.value = newInputResult;

    inputResultResult = newInputResultResult;

    initialed = true;

    changed();
};

onUnmounted(() => {
    props.runningLight.sources.remove(props.parentSourceId, SOURCE_ID);
    props.runningLight.refreshSources(); // make a notification
});

const onInputResultChanged = (r: DataResult<CandidType>) => {
    inputResultResult = r;

    if (r.ok !== undefined) inputResult.value = r.ok;

    // console.error('input', r);

    if (r.err !== undefined) {
        props.runningLight.sources.updateResult(SOURCE_ID, { err: r.err.message });
    } else {
        const runtime = readRuntime<CandidValue>(r.ok);
        props.runningLight.sources.updateResult(SOURCE_ID, deepClone(runtime));
    }
    props.runningLight.refreshSources();

    changed();
};

const produce = (): DataResult<DataSourceInput> => {
    if (!initialed)
        return { err: { message: `${props.status} input source has not been initial.` } };

    if (inputResultResult.err !== undefined) return { err: inputResultResult.err };

    const ok: DataSourceInput = props.initial;

    ok.input.result = inputResultResult.ok;

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<DataSourceInput>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-input-source-content">
        <span v-if="props.status === 'using'"> Input </span>
        <div class="input-content" :class="{ top: props.status !== 'using' }">
            <RunningInputCandidTypeVue
                :status="props.status"
                :runningLight="props.runningLight"
                :initial="inputResult"
                :ui="props.initial.input.ui"
                :mustValidateCurrent="props.status !== 'using' && props.status !== 'completed'"
                :hasLabel="true"
                @changed="onInputResultChanged"
            />
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-input-source-content {
    @apply w-full flex flex-col justify-between items-start mb-3;

    > span {
        font-size: 12px;
        opacity: 0.5;
    }

    > .input-content {
        margin-top: 5px;
        &.top {
            margin-top: 0;
        }
        width: 100%;
    }
}
</style>
