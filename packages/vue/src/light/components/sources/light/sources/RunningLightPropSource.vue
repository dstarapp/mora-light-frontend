<script lang="ts" setup>
import { onBeforeMount, PropType, watch } from 'vue';
import { RunningStatus } from '../../../../../types/running/running';
import { RunningLight } from '../../../../../types/running/light';
import { ValueItem } from '../../../../../types/common/value';
import { DataSourceOuter } from '../../../../../types/parts/sources/outer';
import { CandidValue } from '../@mora-light/core/types/candid';
import { deepClone, DataResult, same, StringResult } from '../../../../../common';

const props = defineProps({
    argResult: {
        type: Object as PropType<StringResult<CandidValue>>,
        required: false,
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
    outerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true, // Need to query the exported external variables, so what internal variables have been generated before the current node is introduced
    },
    initial: {
        type: Object as PropType<DataSourceProp>,
        required: true,
    },
});

let checkedOuterValues: ValueItem[] = [...props.outerValues];

let need = props.initial.outer.result;

const checkArgResult = () => {
    if (props.argResult !== undefined) {
        props.initial.outer.result.runtime = deepClone(props.argResult); // The wrong value is also passed on
        need.runtime = deepClone(props.argResult);
    } else {
        delete props.initial.outer.result.runtime; // Delete the running variable when there are errors
        delete need.runtime;
    }
    changed();
};

watch(
    () => [props.argResult],
    (nv, ov) => {
        if (same(nv, ov)) return;
        checkArgResult();
    },
);

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
    if (props.initial.source !== 'outer') return;

    const newCheckedOuterValues = [...props.outerValues];

    const newNeed = props.initial.outer.result;

    if (initialed && same(checkedOuterValues, newCheckedOuterValues) && same(need, newNeed)) {
        return;
    }

    checkedOuterValues = newCheckedOuterValues;

    need = newNeed;

    checkArgResult();

    initialed = true;

    changed();
};

const produce = (): DataResult<DataSourceProp> => {
    if (!initialed)
        return { err: { message: `${props.status} light outer source has not been initial.` } };

    const ok: DataSourceProp = props.initial;

    ok.outer.result = need;

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<DataSourceProp>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-light-outer-source-content" v-if="props.status === 'using'"></div>
</template>

<style lang="less" scoped>
.running-light-outer-source-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
}
</style>
