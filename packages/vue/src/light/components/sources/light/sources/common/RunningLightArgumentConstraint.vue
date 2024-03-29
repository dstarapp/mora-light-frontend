<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import { RunningStatus } from '../../../../../../types/running/running';
import { RunningLight } from '../../../../../../types/running/light';
import { ValueItem } from '../../../../../../types/common/value';
import {
    ArgumentConstraint,
    BlobArgumentConstraint,
    OptArgumentConstraint,
    RecordArgumentConstraint,
    TupleArgumentConstraint,
    VariantArgumentConstraint,
    VecArgumentConstraint,
} from '../../../../../../types/parts/sources/arg';
import { DataResult, same, StringResult } from '../../../../../../common';
import { DataSource } from '../../../../../../types/parts/sources/sources';
import { CandidValue } from '../../@mora-light/core/types/candid';
import { restoreArgumentConstraint } from '../../../../../../types/parts/sources/light';
import RunningLightWrappedSourceVue from '../RunningLightWrappedSource.vue';
import RunningLightBlobArgumentConstraintVue from './constraints/RunningLightBlobArgumentConstraint.vue';
import RunningLightVecArgumentConstraintVue from './constraints/RunningLightVecArgumentConstraint.vue';
import RunningLightOptArgumentConstraintVue from './constraints/RunningLightOptArgumentConstraint.vue';
import RunningLightRecordArgumentConstraintVue from './constraints/RunningLightRecordArgumentConstraint.vue';
import RunningLightVariantArgumentConstraintVue from './constraints/RunningLightVariantArgumentConstraint.vue';
import RunningLightTupleArgumentConstraintVue from './constraints/RunningLightTupleArgumentConstraint.vue';

const props = defineProps({
    layer: {
        type: Number,
        default: 1, // The top layer is displayed wrong, so it is necessary to record the level
    },
    argResult: {
        type: Object as PropType<StringResult<CandidValue>>,
        required: false,
    },
    triggerRefresh: {
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
    runningLight: {
        type: Object as PropType<RunningLight>,
        required: true,
    },
    parentSourceId: {
        type: Number,
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
    innerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true, // Need to query the exported internal variables, so what internal variables have been produced before the current node is introduced
    },
    outerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true, // Need to query the exported external variables, so what internal variables have been generated before the current node is introduced
    },
    hasLabel: {
        type: Boolean,
        required: true,
    },
    initial: {
        type: Object as PropType<ArgumentConstraint>,
        required: true,
    },
});

let checkedCanExportValues: boolean = props.canExportValues;

const arg = ref<CandidValue | undefined>(undefined); // Anti -tailoring results

// The correct data is passed down down
const value = ref<ArgumentConstraint>(props.initial);

// Receive data that is passed upward
let valueResult: DataResult<ArgumentConstraint> = { ok: value.value };

watch(
    () => props.argResult,
    (nv) => {
        if (nv === undefined || nv.err !== undefined) {
            arg.value = undefined;
            return;
        }
        // The value before cutting is restored
        arg.value = restoreArgumentConstraint(props.initial, nv.ok);
        // console.error(
        //     "using light argument constraint props.argResult",
        //     props.layer,
        //     arg.value,
        //     props.initial,
        //     nv.ok,
        // );
    },
);

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
        if (r.ok.type.runtime !== undefined)
            ok.runtime = r.ok.type.runtime; // Remove the overall result
        else delete ok.runtime;
    } else {
        rr = { err: r.err };
        delete ok.runtime;
    }
    // console.error("tttt", rr);
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
        if (r.ok.runtime !== undefined) ok.runtime = r.ok.runtime; // Remove the overall result
        else delete ok.runtime;
    } else {
        rr = { err: r.err };
        delete ok.runtime;
    }

    if (rr.ok !== undefined) value.value = rr.ok;

    changed();
};

const produce = (): DataResult<ArgumentConstraint> => {
    if (!initialed)
        return {
            err: { message: `${props.status} light argument constraint has not been initial.` },
        };

    if (valueResult.err !== undefined) return { err: valueResult.err };

    return { ok: valueResult.ok };
};

const emit = defineEmits<{
    changed: [DataResult<ArgumentConstraint>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-light-argument-constraint-content">
        <template v-if="value.constraint.type === 'force'">
            <RunningLightWrappedSourceVue
                :argResult="arg !== undefined ? { ok: arg as any } : undefined"
                :triggerRefresh="props.triggerRefresh"
                :status="props.status"
                :index="props.index"
                :runningLight="props.runningLight"
                :parentSourceId="props.parentSourceId"
                :calling="props.calling"
                :canExportValues="props.canExportValues"
                :innerValues="props.innerValues"
                :outerValues="props.outerValues"
                :initial="value.constraint.source"
                @changed="onForceDataSourceChanged"
            />
        </template>
        <template v-else-if="value.constraint.type === 'blob'">
            <RunningLightBlobArgumentConstraintVue
                :layer="props.layer"
                :triggerRefresh="props.triggerRefresh"
                :status="props.status"
                :index="props.index"
                :runningLight="props.runningLight"
                :parentSourceId="props.parentSourceId"
                :calling="props.calling"
                :type="(value.type as any)"
                :canExportValues="props.canExportValues"
                :innerValues="props.innerValues"
                :outerValues="props.outerValues"
                :hasLabel="props.hasLabel"
                :initial="value.constraint"
                @changed="onConstraintChanged"
            />
        </template>
        <template v-else-if="value.constraint.type === 'vec'">
            <RunningLightVecArgumentConstraintVue
                :layer="props.layer"
                :argResult="arg !== undefined ? { ok: arg as any } : undefined"
                :triggerRefresh="props.triggerRefresh"
                :status="props.status"
                :index="props.index"
                :runningLight="props.runningLight"
                :parentSourceId="props.parentSourceId"
                :calling="props.calling"
                :type="(value.type as any)"
                :canExportValues="props.canExportValues"
                :innerValues="props.innerValues"
                :outerValues="props.outerValues"
                :hasLabel="props.hasLabel"
                :initial="value.constraint"
                @changed="onConstraintChanged"
            />
        </template>
        <template v-else-if="value.constraint.type === 'opt'">
            <RunningLightOptArgumentConstraintVue
                :layer="props.layer"
                :argResult="arg !== undefined ? { ok: arg as any } : undefined"
                :triggerRefresh="props.triggerRefresh"
                :status="props.status"
                :index="props.index"
                :runningLight="props.runningLight"
                :parentSourceId="props.parentSourceId"
                :calling="props.calling"
                :type="(value.type as any)"
                :canExportValues="props.canExportValues"
                :innerValues="props.innerValues"
                :outerValues="props.outerValues"
                :hasLabel="props.hasLabel"
                :initial="value.constraint"
                @changed="onConstraintChanged"
            />
        </template>
        <template v-else-if="value.constraint.type === 'record'">
            <RunningLightRecordArgumentConstraintVue
                :layer="props.layer"
                :argResult="arg !== undefined ? { ok: arg as any } : undefined"
                :triggerRefresh="props.triggerRefresh"
                :status="props.status"
                :index="props.index"
                :runningLight="props.runningLight"
                :parentSourceId="props.parentSourceId"
                :calling="props.calling"
                :type="(value.type as any)"
                :canExportValues="props.canExportValues"
                :innerValues="props.innerValues"
                :outerValues="props.outerValues"
                :hasLabel="props.hasLabel"
                :initial="value.constraint"
                @changed="onConstraintChanged"
            />
        </template>
        <template v-else-if="value.constraint.type === 'variant'">
            <RunningLightVariantArgumentConstraintVue
                :layer="props.layer"
                :argResult="arg !== undefined ? { ok: arg as any } : undefined"
                :triggerRefresh="props.triggerRefresh"
                :status="props.status"
                :index="props.index"
                :runningLight="props.runningLight"
                :parentSourceId="props.parentSourceId"
                :calling="props.calling"
                :type="(value.type as any)"
                :canExportValues="props.canExportValues"
                :innerValues="props.innerValues"
                :outerValues="props.outerValues"
                :hasLabel="props.hasLabel"
                :initial="value.constraint"
                @changed="onConstraintChanged"
            />
        </template>
        <template v-else-if="value.constraint.type === 'tuple'">
            <RunningLightTupleArgumentConstraintVue
                :layer="props.layer"
                :argResult="arg !== undefined ? { ok: arg as any } : undefined"
                :triggerRefresh="props.triggerRefresh"
                :status="props.status"
                :index="props.index"
                :runningLight="props.runningLight"
                :parentSourceId="props.parentSourceId"
                :calling="props.calling"
                :type="(value.type as any)"
                :canExportValues="props.canExportValues"
                :innerValues="props.innerValues"
                :outerValues="props.outerValues"
                :hasLabel="props.hasLabel"
                :initial="value.constraint"
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
.running-light-argument-constraint-content {
    width: 100%;
}
</style>
