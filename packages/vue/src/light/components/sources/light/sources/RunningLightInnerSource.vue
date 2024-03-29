<script lang="ts" setup>
import { onBeforeMount, onUnmounted, PropType, watch } from 'vue';
import { RunningStatus } from '../../../../../types/running/running';
import { RunningLight } from '../../../../../types/running/light';
import { ValueItem } from '../../../../../types/common/value';
import { DataSourceInner } from '../../../../../types/parts/sources/inner';
import { deepClone, DataResult, same, StringResult } from '../../../../../common';
import { CandidValue } from '../@mora-light/core/types/candid';

const props = defineProps({
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
    outerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true, // Need to query the exported external variables, so what internal variables have been generated before the current node is introduced
    },
    initial: {
        type: Object as PropType<DataSourceInner>,
        required: true,
    },
});

const SUBSCRIBE_ID = props.runningLight.getNextSubscribeId();

let checkedOuterValues: ValueItem[] = [...props.outerValues];

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.outerValues, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    if (props.initial.source !== 'inner') return;

    const newCheckedOuterValues = [...props.outerValues];

    if (initialed && same(checkedOuterValues, newCheckedOuterValues)) {
        return;
    }

    checkedOuterValues = newCheckedOuterValues;

    subscribe();

    initialed = true;

    changed();
};

watch(
    () => props.initial.inner.name,
    () => subscribe(),
);
// Change of monitoring objects
const subscribe = () => {
    props.runningLight.innerPool.unsubscribe(SUBSCRIBE_ID);
    if (props.initial.inner.name)
        props.runningLight.innerPool.subscribe(
            props.initial.inner.name,
            SUBSCRIBE_ID,
            onRuntimeChanged,
        );
    onRuntimeChanged(); // Take the initiative
};
onUnmounted(() => props.runningLight.innerPool.unsubscribe(SUBSCRIBE_ID));

// If the object of monitoring
const onRuntimeChanged = () => {
    if (!props.initial.inner.name) return;

    const runtimeResult = props.runningLight.innerPool.findValue(
        props.initial.inner.name,
    ) as StringResult<CandidValue>;

    if (runtimeResult !== undefined) {
        props.initial.inner.result.runtime = deepClone(runtimeResult); // The wrong value is also passed on
    } else {
        delete props.initial.inner.result.runtime; // Delete the running variable when there are errors
    }

    changed();
};

const produce = (): DataResult<DataSourceInner> => {
    if (!initialed)
        return { err: { message: `${props.status} light inner source has not been initial.` } };

    const ok: DataSourceInner = props.initial;

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<DataSourceInner>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-light-inner-source-content" v-if="props.status === 'using'"></div>
</template>

<style lang="less" scoped>
.running-light-inner-source-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
}
</style>
