<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import {
    ComponentStatus,
    RunningLight,
    ValueItem,
    checkArgumentConstraint,
    findInnerValueItemsByArgumentConstraint,
    findOuterValueItemsByArgumentConstraint,
    hasUIByArgumentConstraint,
} from '@mora-light/core/types/running';
import { ArgumentConstraint, RecordArgumentConstraint } from '@mora-light/core/types/source';
import {
    assignRuntime,
    checkAndExecute,
    DataResult,
    deleteRuntime,
    readRuntime,
    same,
} from '@mora-light/core/types/common';
import {
    CandidType,
    CandidValue,
    CandidValueObject,
    RecItem,
    RecordCandidType,
} from '@mora-light/core/types/candid';
import RunningArgumentConstraintVue from '../RunningArgumentConstraint.vue';

const parseDataResult = (
    constraints: ArgumentConstraint[],
    canExportValues: boolean,
    values: { outerValues: ValueItem[]; propValues: ValueItem[]; innerValues: ValueItem[] },
    subitemsEls: HTMLElement[],
): DataResult<ArgumentConstraint>[] => {
    let outerValues = [...values.outerValues];
    let propValues = [...values.propValues];
    let innerValues = [...values.innerValues];

    const subitemsResults: DataResult<ArgumentConstraint>[] = [];
    for (let i = 0; i < constraints.length; i++) {
        const r = checkArgumentConstraint(
            constraints[i],
            canExportValues,
            { outerValues, propValues, innerValues },
            subitemsEls[i],
        );
        subitemsResults[i] = r.result;
        outerValues = r.values.outerValues!;
        innerValues = r.values.innerValues;
    }

    return subitemsResults;
};

const props = defineProps({
    layer: {
        type: Number,
        required: true, // The top layer is displayed wrong, so it is necessary to record the level
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
    recItems: {
        type: Array as PropType<RecItem[]>,
        required: true, // The type that once appeared
    },
    type: {
        type: Object as PropType<RecordCandidType>,
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
    initial: {
        type: Object as PropType<RecordArgumentConstraint>,
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

const subitemsRefs = ref<HTMLElement[]>([]);
const setSubitemsRef = (el: any, i: number) => (subitemsRefs.value[i] = el);

let checkedType: CandidType = props.type;
let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.values.innerValues];
let checkedOuterValues: ValueItem[] = [...props.values.outerValues];

// The correct data is passed down down
const recordSubitems = ref<ArgumentConstraint[]>(props.initial.subitems);

// Receive data that is passed upward
let recordSubitemsResults: DataResult<ArgumentConstraint>[] = parseDataResult(
    recordSubitems.value,
    props.canExportValues,
    props.values,
    subitemsRefs.value,
);

// Each ArgumentConstraint on this page may add Inner Values
const innerValues = computed<ValueItem[][]>(() => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...props.values.innerValues]; // Passing data start

    result[0] = [...last];

    for (let i = 1; i < recordSubitems.value.length; i++) {
        const c = recordSubitems.value[i - 1]; // Get the previous data source

        let valueItems: ValueItem[] = [...last];

        findInnerValueItemsByArgumentConstraint(
            c,
            { propValues: props.values.propValues },
            valueItems,
        );

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("innerValues record argument constraint", result);

    return result;
});
// Each ArgumentConstraint on this page is likely to add Out Values
const outerValues = computed<ValueItem[][]>(() => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...props.values.outerValues]; // Passing data start

    result[0] = [...last];

    for (let i = 1; i < recordSubitems.value.length; i++) {
        const c = recordSubitems.value[i - 1]; // Get the previous data source

        let valueItems: ValueItem[] = [...last];

        findOuterValueItemsByArgumentConstraint(
            c,
            { propValues: props.values.propValues, innerValues: [...innerValues.value[i]] },
            valueItems,
        );

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("outerValues record argument constraint", result);

    return result;
});

const hasContents = computed(() =>
    recordSubitems.value.map((constraint) => hasUIByArgumentConstraint(constraint)),
);

const marginTop = computed(() => {
    const r: boolean[] = [];
    for (let i = 0; i < recordSubitems.value.length; i++) {
        if (!hasContents.value[i]) {
            r[i] = false;
            continue;
        }
        let top = false;
        for (let j = i - 1; 0 <= j; j--) {
            if (hasContents.value[j]) {
                top = true;
                break;
            }
        }
        r[i] = top;
    }
    return r;
});

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.type, props.canExportValues, props.values, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedType: CandidType = props.type;
    const newCheckedCanExportValues = props.canExportValues;
    const newCheckedInnerValues: ValueItem[] = [...props.values.innerValues];
    const newCheckedOuterValues: ValueItem[] = [...props.values.outerValues];

    const newRecordSubitems = props.initial.subitems;

    const newRecordSubitemsResults = parseDataResult(
        newRecordSubitems,
        newCheckedCanExportValues,
        {
            outerValues: newCheckedOuterValues,
            propValues: props.values.propValues,
            innerValues: newCheckedInnerValues,
        },
        subitemsRefs.value,
    );

    if (
        initialed &&
        same(checkedType, newCheckedType) &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(recordSubitems.value, newRecordSubitems) &&
        same(recordSubitemsResults, newRecordSubitemsResults)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedType = newCheckedType;
    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    recordSubitems.value = newRecordSubitems;

    recordSubitemsResults = newRecordSubitemsResults;

    initialed = true;

    changed();
};

const onRecordSubitemsChanged = (i: number, r: DataResult<ArgumentConstraint>) => {
    recordSubitemsResults[i] = r;

    if (r.ok !== undefined) recordSubitems.value[i] = r.ok;

    changed();
};

const produce = (): DataResult<RecordArgumentConstraint> => {
    if (!initialed)
        return {
            err: { message: `${props.status} record argument constraint has not been initial.` },
        };

    for (let i = 0; i < recordSubitemsResults.length; i++) {
        const err = recordSubitemsResults[i].err;
        if (err) return { err };
    }

    const ok: RecordArgumentConstraint = props.initial;

    ok.subitems = recordSubitemsResults.map((r) => r.ok!);

    deleteRuntime(ok);

    let runtime: CandidValueObject | undefined = {};
    for (let i = 0; i < ok.subitems.length; i++) {
        const subitem = ok.subitems[i];
        const result = readRuntime<CandidValue>(subitem)?.ok;
        if (result === undefined) {
            runtime = undefined;
            break;
        }
        runtime[props.type.subitems[i].key] = result;
    }

    if (runtime !== undefined) assignRuntime(ok, { ok: runtime });

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<RecordArgumentConstraint>];
}>();

const changed = () =>
    checkAndExecute(
        (props.status !== 'using' ||
            subitemsRefs.value.filter((v) => !!v).length >= recordSubitems.value.length) &&
            recordSubitemsResults.length >= recordSubitems.value.length,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-record-argument-constraint-content">
        <div
            class="item"
            v-for="(subitem, i) in recordSubitems"
            :key="i"
            :class="{ 'margin-top': marginTop[i] }"
            :record-key="props.type.subitems[i].key"
        >
            <template v-if="hasContents[i]">
                <input type="text" disabled v-model="props.type.subitems[i].key" />
            </template>
            <RunningArgumentConstraintVue
                :layer="props.layer + 1"
                :parentSourceId="props.parentSourceId"
                :status="props.status"
                :runningLight="props.runningLight"
                :values="{
                    outerValues: outerValues[i],
                    propValues: props.values.propValues,
                    innerValues: innerValues[i],
                }"
                :calling="props.calling"
                :canExportValues="props.canExportValues"
                :index="i"
                :recItems="props.recItems"
                :initial="subitem"
                :hasLabel="props.hasLabel"
                :triggerRefresh="props.triggerRefresh"
                @changed="(r) => onRecordSubitemsChanged(i, r)"
                :ref="(el) => setSubitemsRef(el, i)"
            />
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-record-argument-constraint-content {
    width: 100%;
    > .item {
        &.margin-top {
            margin-top: 10px;
        }
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: flex-start;
        > input {
            margin-right: 10px;
            width: 120px;
            height: 28px;
            border: 1px solid #77777755;
            padding-left: 5px;
        }
    }
}
</style>
