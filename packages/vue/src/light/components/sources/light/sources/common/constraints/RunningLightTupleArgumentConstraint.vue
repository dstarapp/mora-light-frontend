<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import { RunningStatus } from '../../../../../../../types/running/running';
import { RunningLight } from '../../../../../../../types/running/light';
import { CandidType, CandidValue, TupleCandidType } from '../../../@mora-light/core/types/candid';
import {
    ValueItem,
    findOuterValueItemsByArgumentConstraint,
    findInnerValueItemsByArgumentConstraint,
} from '../../../../../../../types/common/value';
import {
    ArgumentConstraint,
    TupleArgumentConstraint,
} from '../../../../../../../types/parts/sources/arg';
import { checkAndExecute, DataResult, same, StringResult } from '../../../../../../../common';
import { checkArgumentConstraint } from '../../../../../../../types/common/check';
import { hasUIByArgumentConstraint } from '../../../../../../../types/running/ui';
import RunningLightArgumentConstraintVue from '../RunningLightArgumentConstraint.vue';

const parseDataResult = (
    constraints: ArgumentConstraint[],
    canExportValues: boolean,
    innerValues: ValueItem[],
    outerValues: ValueItem[],
    itemsEls: HTMLElement[],
): DataResult<ArgumentConstraint>[] => {
    innerValues = [...innerValues];
    outerValues = [...outerValues];

    const itemsResults: DataResult<ArgumentConstraint>[] = [];
    for (let i = 0; i < items.length; i++) {
        const r = checkArgumentConstraint(
            items[i],
            canExportValues,
            innerValues,
            outerValues,
            itemsEls[i],
        );
        itemsResults[i] = r.result;
        innerValues = r.innerValues;
        outerValues = r.outerValues!;
    }

    return itemsResults;
};

const props = defineProps({
    layer: {
        type: Number,
        required: true, // The top layer is displayed wrong, so it is necessary to record the level
    },
    argResult: {
        type: Object as PropType<StringResult<CandidValue[]>>,
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
    type: {
        type: Object as PropType<TupleCandidType>,
        required: true,
    },
    canExportValues: {
        type: Boolean,
        required: true, // There is a state that has an export internal variable option, because the state that can only be determined during use or runtime is not exported
    },
    innerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true,
    },
    outerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true,
    },
    hasLabel: {
        type: Boolean,
        required: true,
    },
    initial: {
        type: Object as PropType<TupleArgumentConstraint>,
        required: true,
    },
});

const itemsRefs = ref<HTMLElement[]>([]);

let checkedType: CandidType = props.type;
let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.innerValues];
let checkedOuterValues: ValueItem[] = [...props.outerValues];

// The correct data is passed down down
const tupleItems = ref<ArgumentConstraint[]>(props.initial.items);

// Receive data that is passed upward
let tupleItemsResults: DataResult<ArgumentConstraint>[] = parseDataResult(
    tupleItems.value,
    props.canExportValues,
    props.innerValues,
    props.outerValues,
    itemsRefs.value,
);

// Each ArgumentConstraint on this page may add Inner Values
const innerValues = computed<ValueItem[][]>(() => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...props.innerValues]; // Passing data start

    result[0] = [...last];

    for (let i = 1; i < tupleItems.value.length; i++) {
        const c = tupleItems.value[i - 1]; // Get the previous data source

        let valueItems: ValueItem[] = [...last];

        findInnerValueItemsByArgumentConstraint(c, valueItems);

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("innerValues tuple argument constraint", result);

    return result;
});
// Each ArgumentConstraint on this page is likely to add Out Values
const outerValues = computed<ValueItem[][]>(() => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...props.outerValues]; // Passing data start

    result[0] = [...last];

    for (let i = 1; i < tupleItems.value.length; i++) {
        const c = tupleItems.value[i - 1]; // Get the previous data source

        let valueItems: ValueItem[] = [...last];

        findOuterValueItemsByArgumentConstraint(c, valueItems, [...innerValues.value[i]]);

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("outerValues tuple argument constraint", result);

    return result;
});

const hasContents = computed(() =>
    tupleItems.value.map((constraint) => hasUIByArgumentConstraint(constraint)),
);

const marginTop = computed(() => {
    const r: boolean[] = [];
    for (let i = 0; i < tupleItems.value.length; i++) {
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
    () => [props.type, props.canExportValues, props.innerValues, props.outerValues, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedType: CandidType = props.type;
    const newCheckedCanExportValues = props.canExportValues;
    const newCheckedInnerValues: ValueItem[] = [...props.innerValues];
    const newCheckedOuterValues: ValueItem[] = [...props.outerValues];

    const newTupleItems = props.initial.items;

    const newTupleItemsResults = parseDataResult(
        newTupleItems,
        newCheckedCanExportValues,
        newCheckedInnerValues,
        newCheckedOuterValues,
        itemsRefs.value,
    );

    if (
        initialed &&
        same(checkedType, newCheckedType) &&
        same(checkedCanExportValues, newCheckedCanExportValues) &&
        same(checkedInnerValues, newCheckedInnerValues) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(tupleItems.value, newTupleItems) &&
        same(tupleItemsResults, newTupleItemsResults)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedType = newCheckedType;
    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    tupleItems.value = newTupleItems;

    tupleItemsResults = newTupleItemsResults;

    initialed = true;

    changed();
};

const onTupleItemsChanged = (i: number, r: DataResult<ArgumentConstraint>) => {
    tupleItemsResults[i] = r;

    if (r.ok !== undefined) tupleItems.value[i] = r.ok;

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

    ok.items = tupleItemsResults.map((r) => r.ok!);

    delete ok.runtime;

    let runtime: (CandidValue | undefined)[] = ok.items.map((subitem) => subitem.runtime?.ok);

    if (!runtime.filter((v) => v === undefined).length)
        ok.runtime = { ok: runtime as CandidValue[] };

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<TupleArgumentConstraint>];
}>();

const changed = () =>
    checkAndExecute(
        (props.status !== 'using' ||
            itemsRefs.value.filter((v) => !!v).length >= tupleItems.value.length) &&
            tupleItemsResults.length >= tupleItems.value.length,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-tuple-argument-constraint-content">
        <div
            class="item"
            v-for="(subitem, i) in tupleItems"
            :key="i"
            :class="{ 'margin-top': marginTop[i] }"
            :tuple-index="i"
        >
            <template v-if="hasContents[i] && props.type.items.length !== 1">
                <span>{{ `${i}` }}</span>
                <span class="colon">:</span>
            </template>
            <RunningLightArgumentConstraintVue
                :layer="props.layer + 1"
                :argResult="
                    props.argResult?.ok !== undefined ? ({ ok: props.argResult.ok[i] } as StringResult<CandidValue>) : undefined
                "
                :triggerRefresh="props.triggerRefresh"
                :status="props.status"
                :index="i"
                :runningLight="props.runningLight"
                :parentSourceId="props.parentSourceId"
                :calling="props.calling"
                :canExportValues="props.canExportValues"
                :innerValues="innerValues[i]"
                :outerValues="outerValues[i]"
                :hasLabel="props.hasLabel"
                :initial="item"
                @changed="(r) => onTupleItemsChanged(i, r)"
                :ref="(el: any) => (itemsRefs[i] = el)"
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
