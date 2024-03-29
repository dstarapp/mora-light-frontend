<script lang="ts" setup>
import { onBeforeMount, PropType, watch } from 'vue';
import { RunningStatus } from '../../../../../types/running/running';
import { ValueItem } from '../../../../../types/common/value';
import { DataSourceConstant } from '../../../../../types/parts/sources/constant';
import { DataResult, same, deepClone } from '../../../../../common';

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    index: {
        type: Number,
        required: false, // Display serial number
    },
    outerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true, // Need to query the exported external variables, so what internal variables have been generated before the current node is introduced
    },
    initial: {
        type: Object as PropType<DataSourceConstant>,
        required: true,
    },
});

let checkedOuterValues: ValueItem[] = [...props.outerValues];
let checkedSource: DataSourceConstant = props.initial;

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
    if (props.initial.source !== 'constant') return;

    const newCheckedOuterValues = [...props.outerValues];
    const newCheckedSource = props.initial;

    if (
        initialed &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(checkedSource, newCheckedSource)
    ) {
        return;
    }

    // Always set to constant value
    newCheckedSource.constant.result.runtime = { ok: deepClone(newCheckedSource.constant.value) };

    checkedOuterValues = newCheckedOuterValues;
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
    <div class="running-light-constant-source-content" v-if="props.status === 'using'"></div>
</template>

<style lang="less" scoped>
.running-light-constant-source-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
}
</style>
