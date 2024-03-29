<script lang="ts" setup>
import { computed, onBeforeMount, PropType, watch } from 'vue';
import { findTransformToCandidType } from '@mora-light/core/types/transform';
import RunningExportedCandidTypeVue from '../exports/RunningExportedCandidType.vue';

const props = defineProps({
    callingRefresh: {
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
    from: {
        type: Object as PropType<CandidType>,
        required: true, // The running result type of the light also needs to be used
    },
    outerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true, // Need to query the exported external variables, so what internal variables have been generated before the current node is introduced
    },
    initial: {
        type: Object as PropType<DataTransmitExportedOuter>,
        required: true,
    },
});

let checkedFrom: CandidType = props.from;
let checkedOuterValues: ValueItem[] = [...props.outerValues];
let checkedExportedOuter: DataTransmitExportedOuter = props.initial;

let exportedResult: DataResult<ExportedOuter> = { ok: props.initial.exported };

const type = computed(
    () => findAloneType(findTransformToCandidType(props.initial.transform) ?? props.from).type,
);

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.from, props.outerValues, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedFrom = props.from;
    const newCheckedOuterValues = [...props.outerValues];
    const newCheckedExportedOuter = props.initial;

    const newExportedResult = { ok: newCheckedExportedOuter.exported };

    if (
        initialed &&
        same(checkedFrom, newCheckedFrom) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(checkedExportedOuter, newCheckedExportedOuter) &&
        same(exportedResult, newExportedResult)
    ) {
        return;
    }

    checkedFrom = newCheckedFrom;
    checkedOuterValues = newCheckedOuterValues;
    checkedExportedOuter = newCheckedExportedOuter;

    exportedResult = newExportedResult;

    initialed = true;

    changed();
};

const onExportedOuterChanged = (r: DataResult<ExportedOuter>) => {
    exportedResult = r;

    changed();
};

const produce = (): DataResult<DataTransmitExportedOuter> => {
    if (!initialed)
        return { err: { message: `${props.status} exported outer has not been initial.` } };

    if (exportedResult.err !== undefined) return { err: exportedResult.err };

    const ok: DataTransmitExportedOuter = props.initial;

    ok.exported = exportedResult.ok;

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<DataTransmitExportedOuter>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-exported-outer-content">
        <template v-if="props.status === 'using'">
            <!-- In use, the editing interface of exported external variables should be displayed -->
            <span>{{ index }} Export external variables</span>
            <RunningExportedCandidTypeVue
                :outerValues="props.outerValues"
                :type="type"
                :initial="props.initial.exported"
                @changed="onExportedOuterChanged"
                class="exported-outer"
            />
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-exported-outer-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    > span {
        font-size: 12px;
        opacity: 0.6;
    }
    > .exported-outer {
        margin-top: 5px;
    }
}
</style>
