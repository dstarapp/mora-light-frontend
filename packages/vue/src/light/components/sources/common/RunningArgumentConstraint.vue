<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import { ComponentStatus, RunningLight, ValueItem } from '@mora-light/core/types/running';
import RunningWrappedSourceVue from '../RunningWrappedSource.vue';
import {
    ArgumentConstraint,
    BlobArgumentConstraint,
    DataSource,
    OptArgumentConstraint,
    RecordArgumentConstraint,
    TupleArgumentConstraint,
    VariantArgumentConstraint,
    VecArgumentConstraint,
} from '@mora-light/core/types/source';
import {
    assignRuntime,
    DataResult,
    deleteRuntime,
    readRuntime,
    same,
} from '@mora-light/core/types/common';
import RunningBlobArgumentConstraintVue from './constraints/RunningBlobArgumentConstraint.vue';
import RunningVecArgumentConstraintVue from './constraints/RunningVecArgumentConstraint.vue';
import RunningOptArgumentConstraintVue from './constraints/RunningOptArgumentConstraint.vue';
import RunningRecordArgumentConstraintVue from './constraints/RunningRecordArgumentConstraint.vue';
import RunningVariantArgumentConstraintVue from './constraints/RunningVariantArgumentConstraint.vue';
import RunningTupleArgumentConstraintVue from './constraints/RunningTupleArgumentConstraint.vue';
import RunningRecArgumentConstraintVue from './constraints/RunningRecArgumentConstraint.vue';
import { MainRecCandidType, RecItem } from '@mora-light/core/types/candid';

const props = defineProps({
    layer: {
        type: Number,
        default: 1, // The top layer is displayed wrong, so it is necessary to record the level
    },
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
    recItems: {
        type: Array as PropType<RecItem[]>,
        required: true, // The type that once appeared
    },
    initial: {
        type: Object as PropType<ArgumentConstraint>,
        required: true,
    },
    hasLabel: {
        type: Boolean,
        required: true,
    },
    triggerRefresh: {
        type: Number,
        required: true,
    },
});

let checkedCanExportValues: boolean = props.canExportValues;

// The correct data is passed down down
const value = ref<ArgumentConstraint>(props.initial);

// Receive data that is passed upward
let valueResult: DataResult<ArgumentConstraint> = { ok: value.value };

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.canExportValues, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedCanExportValues = props.canExportValues;

    const newValue = props.initial;
    const newValueResult = { ok: newValue };

    if (
        initialed &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(value.value, newValue) &&
        same(valueResult, newValueResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    // console.error("using argument constraint init value", newValue);

    checkedCanExportValues = newCheckedCanExportValues;

    value.value = newValue;

    valueResult = newValueResult;

    initialed = true;

    changed();
};

const onForceDataSourceChanged = (r: DataResult<DataSource>) => {
    const ok = value.value;

    let rr: DataResult<ArgumentConstraint>;
    if (r.ok !== undefined) {
        ok.constraint = { type: 'force', source: r.ok };
        rr = { ok }; // Package
        if (r.ok.runtime !== undefined)
            assignRuntime(ok, r.ok.runtime); // Remove the overall result
        else deleteRuntime(ok);
    } else {
        rr = { err: r.err };
        deleteRuntime(ok);
    }

    valueResult = rr;

    if (rr.ok !== undefined) value.value = rr.ok;

    changed();
};

const onConstraintChanged = (
    r: DataResult<
        | BlobArgumentConstraint
        | VecArgumentConstraint
        | OptArgumentConstraint
        | RecordArgumentConstraint
        | VariantArgumentConstraint
        | TupleArgumentConstraint
    >,
) => {
    const ok = value.value;

    let rr: DataResult<ArgumentConstraint>;
    if (r.ok !== undefined) {
        ok.constraint = r.ok;
        rr = { ok }; // Package
        if (readRuntime(r.ok) !== undefined)
            assignRuntime(ok, readRuntime(r.ok)); // Remove the overall result
        else deleteRuntime(ok);
    } else {
        rr = { err: r.err };
        deleteRuntime(ok);
    }

    // console.error('argument onConstraintChanged', r, rr);

    if (rr.ok !== undefined) value.value = rr.ok;

    changed();
};

const produce = (): DataResult<ArgumentConstraint> => {
    if (!initialed)
        return { err: { message: `${props.status} argument constraint has not been initial.` } };

    if (valueResult.err !== undefined) return { err: valueResult.err };

    // console.error('argument produce', valueResult.ok);

    return { ok: valueResult.ok };
};

const emit = defineEmits<{
    changed: [DataResult<ArgumentConstraint>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-argument-constraint-content">
        <template v-if="value.constraint.type === 'force'">
            <RunningWrappedSourceVue
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :initial="value.constraint.source"
                :triggerRefresh="props.triggerRefresh"
                @changed="onForceDataSourceChanged"
            />
        </template>
        <template v-else-if="value.constraint.type === 'blob'">
            <RunningBlobArgumentConstraintVue
                :layer="props.layer"
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :recItems="props.recItems"
                :type="(value.type as any)"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :initial="value.constraint"
                :hasLabel="props.hasLabel"
                :triggerRefresh="props.triggerRefresh"
                @changed="onConstraintChanged"
            />
        </template>
        <template v-else-if="value.constraint.type === 'vec'">
            <RunningVecArgumentConstraintVue
                :layer="props.layer"
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :recItems="props.recItems"
                :type="(value.type as any)"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :initial="value.constraint"
                :hasLabel="props.hasLabel"
                :triggerRefresh="props.triggerRefresh"
                @changed="onConstraintChanged"
            />
        </template>
        <template v-else-if="value.constraint.type === 'opt'">
            <RunningOptArgumentConstraintVue
                :layer="props.layer"
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :recItems="props.recItems"
                :type="(value.type as any)"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :initial="value.constraint"
                :hasLabel="props.hasLabel"
                :triggerRefresh="props.triggerRefresh"
                @changed="onConstraintChanged"
            />
        </template>
        <template v-else-if="value.constraint.type === 'record'">
            <RunningRecordArgumentConstraintVue
                :layer="props.layer"
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :recItems="props.recItems"
                :type="(value.type as any)"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :initial="value.constraint"
                :hasLabel="props.hasLabel"
                :triggerRefresh="props.triggerRefresh"
                @changed="onConstraintChanged"
            />
        </template>
        <template v-else-if="value.constraint.type === 'variant'">
            <RunningVariantArgumentConstraintVue
                :layer="props.layer"
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :recItems="props.recItems"
                :type="(value.type as any)"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :initial="value.constraint"
                :hasLabel="props.hasLabel"
                :triggerRefresh="props.triggerRefresh"
                @changed="onConstraintChanged"
            />
        </template>
        <template v-else-if="value.constraint.type === 'tuple'">
            <RunningTupleArgumentConstraintVue
                :layer="props.layer"
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :recItems="props.recItems"
                :type="(value.type as any)"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :initial="value.constraint"
                :hasLabel="props.hasLabel"
                :triggerRefresh="props.triggerRefresh"
                @changed="onConstraintChanged"
            />
        </template>
        <template v-else-if="value.constraint.type === 'rec'">
            <RunningRecArgumentConstraintVue
                :layer="props.layer"
                :status="props.status"
                :parentSourceId="props.parentSourceId"
                :runningLight="props.runningLight"
                :values="props.values"
                :calling="props.calling"
                :recItems="
                    value.type.subtype !== undefined
                        ? [...props.recItems, { id: value.type.id!, type: value.type as MainRecCandidType }]
                        : props.recItems
                "
                :type="(value.type as any)"
                :canExportValues="props.canExportValues"
                :index="props.index"
                :initial="value.constraint"
                :hasLabel="props.hasLabel"
                :triggerRefresh="props.triggerRefresh"
                @changed="onConstraintChanged"
            />
        </template>
        <template v-else>
            <div class="error">
                The bank should not appear, all states should have a corresponding branch
            </div>
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-argument-constraint-content {
    width: 100%;
}
</style>
