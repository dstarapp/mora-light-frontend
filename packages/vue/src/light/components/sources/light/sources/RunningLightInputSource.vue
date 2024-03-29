<script lang="ts" setup>
import { onBeforeMount, PropType, watch } from 'vue';
import { RunningStatus } from '../../../../../types/running/running';
import { RunningLight } from '../../../../../types/running/light';
import { ValueItem } from '../../../../../types/common/value';
import { DataSourceInput } from '../../../../../types/parts/sources/input';
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
        type: Object as PropType<DataSourceInput>,
        required: true,
    },
});

let checkedOuterValues: ValueItem[] = [...props.outerValues];

let need = props.initial.input.result;

const checkArgResult = () => {
    // console.error("using light input source checkArgResult", props.argResult);

    if (props.argResult !== undefined) {
        props.initial.input.result.runtime = deepClone(props.argResult); // The wrong value is also passed on
        need.runtime = deepClone(props.argResult);
    } else {
        delete props.initial.input.result.runtime; // Delete the running variable when there are errors
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
    if (props.initial.source !== 'input') return;

    const newCheckedOuterValues = [...props.outerValues];

    const newNeed = props.initial.input.result;

    if (initialed && same(checkedOuterValues, newCheckedOuterValues) && same(need, newNeed)) {
        return;
    }

    checkedOuterValues = newCheckedOuterValues;

    need = newNeed;

    checkArgResult();

    initialed = true;

    changed();
};

const produce = (): DataResult<DataSourceInput> => {
    if (!initialed)
        return { err: { message: `${props.status} light input source has not been initial.` } };

    const ok: DataSourceInput = props.initial;

    ok.input.result = need;

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<DataSourceInput>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-light-input-source-content" v-if="props.status === 'using'"></div>
</template>

<style lang="less" scoped>
.running-light-input-source-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
}
</style>
