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
import { ArgumentConstraint, TupleArgumentConstraint } from '@mora-light/core/types/source';
import {
    assignRuntime,
    checkAndExecute,
    DataResult,
    deleteRuntime,
    readRuntime,
    same,
} from '@mora-light/core/types/common';
import { CandidType, CandidValue, RecItem, TupleCandidType } from '@mora-light/core/types/candid';
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
        type: Object as PropType<TupleCandidType>,
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
        type: Object as PropType<TupleArgumentConstraint>,
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
const tupleSubitems = ref<ArgumentConstraint[]>(props.initial.subitems);

// Receive data that is passed upward
let tupleItemsResults: DataResult<ArgumentConstraint>[] = parseDataResult(
    tupleSubitems.value,
    props.canExportValues,
    props.values,
    subitemsRefs.value,
);

// Each ArgumentConstraint on this page may add Inner Values
const innerValues = computed<ValueItem[][]>(() => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...props.values.innerValues]; // Passing data start

    result[0] = [...last];

    for (let i = 1; i < tupleSubitems.value.length; i++) {
        const c = tupleSubitems.value[i - 1]; // Get the previous data source

        let valueItems: ValueItem[] = [...last];

        findInnerValueItemsByArgumentConstraint(
            c,
            { propValues: props.values.propValues },
            valueItems,
        );

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("innerValues tuple argument constraint", result);

    return result;
});
// Each ArgumentConstraint on this page is likely to add Out Values
const outerValues = computed<ValueItem[][]>(() => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...props.values.outerValues]; // Passing data start

    result[0] = [...last];

    for (let i = 1; i < tupleSubitems.value.length; i++) {
        const c = tupleSubitems.value[i - 1]; // Get the previous data source

        let valueItems: ValueItem[] = [...last];

        findOuterValueItemsByArgumentConstraint(
            c,
            { propValues: props.values.propValues, innerValues: [...innerValues.value[i]] },
            valueItems,
        );

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("outerValues tuple argument constraint", result);

    return result;
});

const hasContents = computed(() =>
    tupleSubitems.value.map((subitem) => hasUIByArgumentConstraint(subitem)),
);

const marginTop = computed(() => {
    const r: boolean[] = [];
    for (let i = 0; i < tupleSubitems.value.length; i++) {
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

    const newTupleSubitems = props.initial.subitems;

    const newTupleItemsResults = parseDataResult(
        newTupleSubitems,
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
        same(tupleSubitems.value, newTupleSubitems) &&
        same(tupleItemsResults, newTupleItemsResults)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedType = newCheckedType;
    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    tupleSubitems.value = newTupleSubitems;

    tupleItemsResults = newTupleItemsResults;

    initialed = true;

    changed();
};

const onTupleSubitemsChanged = (i: number, r: DataResult<ArgumentConstraint>) => {
    tupleItemsResults[i] = r;

    if (r.ok !== undefined) tupleSubitems.value[i] = r.ok;

    changed();
};

const produce = (): DataResult<TupleArgumentConstraint> => {
    if (!initialed)
        return {
            err: { message: `${props.status} tuple argument constraint has not been initial.` },
        };

    for (let i = 0; i < tupleItemsResults.length; i++) {
        const err = tupleItemsResults[i].err;
        if (err) return { err };
    }

    const ok: TupleArgumentConstraint = props.initial;

    ok.subitems = tupleItemsResults.map((r) => r.ok!);

    deleteRuntime(ok);

    let runtime: (CandidValue | undefined)[] = ok.subitems.map(
        (subitem) => readRuntime<CandidValue>(subitem)?.ok,
    );

    if (!runtime.filter((v) => v === undefined).length)
        assignRuntime(ok, { ok: runtime as CandidValue[] });

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<TupleArgumentConstraint>];
}>();

const changed = () =>
    checkAndExecute(
        (props.status !== 'using' ||
            subitemsRefs.value.filter((v) => !!v).length >= tupleSubitems.value.length) &&
            tupleItemsResults.length >= tupleSubitems.value.length,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-tuple-argument-constraint-content">
        <div
            class="item"
            v-for="(subitem, i) in tupleSubitems"
            :key="i"
            :class="{ 'margin-top': marginTop[i] }"
            :tuple-index="i"
        >
            <template v-if="hasContents[i] && props.type.subitems.length !== 1">
                <span>{{ `${i}` }}</span>
                <span class="colon">:</span>
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
                @changed="(r) => onTupleSubitemsChanged(i, r)"
                :ref="(el) => setSubitemsRef(el, i)"
            />
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-tuple-argument-constraint-content {
    width: 100%;
    > .item {
        &.margin-top {
            margin-top: 10px;
        }
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: flex-start;
        > span {
            width: 20px;
            height: 28px;
            flex-shrink: 0;
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: flex-start;
            padding-top: 1px;
            font-size: 12px;
        }
        > .colon {
            width: 15px;
            flex-shrink: 0;
            justify-content: flex-start;
        }
        > span {
            display: none;
        }
    }
}
</style>
