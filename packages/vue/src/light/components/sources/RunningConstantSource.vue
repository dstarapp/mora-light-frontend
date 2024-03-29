<script lang="ts" setup>
import { onBeforeMount, PropType, watch } from 'vue';
import { ComponentStatus, RunningLight } from '@mora-light/core/types/running';
import { DataSourceConstant } from '@mora-light/core/types/source';
import { assignRuntime, DataResult, deepClone, same } from '@mora-light/core/types/common';

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
        type: Object as PropType<DataSourceConstant>,
        required: true,
    },
});

let checkedSource: DataSourceConstant = props.initial;

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
    if (props.initial.source !== 'constant') return;

    const newCheckedSource = props.initial;

    if (initialed && same(checkedSource, newCheckedSource)) {
        return;
    }

    // Always set to constant value
    assignRuntime(newCheckedSource.constant.result, {
        ok: deepClone(newCheckedSource.constant.value),
    });

    checkedSource = newCheckedSource;

    initialed = true;

    changed();
};

const produce = (): DataResult<DataSourceConstant> => {
    if (!initialed)
        return { err: { message: `${props.status} constant source has not been initial.` } };

    const ok: DataSourceConstant = props.initial;

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<DataSourceConstant>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-constant-source-content" v-if="props.status === 'using'">
        <span v-if="props.initial.exported?.target === 'outer'"> Constant </span>
    </div>
</template>

<style lang="less" scoped>
.running-constant-source-content {
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
