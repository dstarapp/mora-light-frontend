<script lang="ts" setup>
import { onBeforeMount, onUnmounted, PropType, watch } from 'vue';
import { ComponentStatus, RunningLight } from '@mora-light/core/types/running';
import { DataSourceInner } from '@mora-light/core/types/source';
import {
    assignRuntime,
    DataResult,
    deepClone,
    deleteRuntime,
    same,
    StringResult,
} from '@mora-light/core/types/common';
import { CandidValue } from '@mora-light/core/types/candid';

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
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
        type: Object as PropType<DataSourceInner>,
        required: true,
    },
});

const SUBSCRIBE_ID = props.runningLight.getNextSubscribeId();

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    if (props.initial.source !== 'inner') return;

    if (initialed) {
        return;
    }

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
        assignRuntime(props.initial.inner.result, deepClone(runtimeResult)); // The wrong value is also passed on
    } else {
        deleteRuntime(props.initial.inner.result); // Delete the running variable when there are errors
    }

    changed();
};

const produce = (): DataResult<DataSourceInner> => {
    if (!initialed)
        return { err: { message: `${props.status} inner source has not been initial.` } };

    const ok: DataSourceInner = props.initial;

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<DataSourceInner>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-inner-source-content" v-if="props.status === 'using'">
        <span v-if="props.initial.exported?.target === 'outer'"> Inner Variable </span>
    </div>
</template>

<style lang="less" scoped>
.running-inner-source-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    > span {
        font-size: 12px;
        opacity: 0.5;
    }
}
</style>
