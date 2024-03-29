<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import { RunningStatus } from '../../../../../../../types/running/running';
import { RunningLight } from '../../../../../../../types/running/light';
import {
    CandidType,
    CandidValue,
    CandidValueObject,
    RecordCandidType,
} from '../../../@mora-light/core/types/candid';
import {
    ValueItem,
    findOuterValueItemsByArgumentConstraint,
    findInnerValueItemsByArgumentConstraint,
} from '../../../../../../../types/common/value';
import {
    ArgumentConstraint,
    RecordArgumentConstraint,
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
        type: Object as PropType<StringResult<CandidValueObject>>,
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
        type: Object as PropType<RecordCandidType>,
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
        type: Object as PropType<RecordArgumentConstraint>,
        required: true,
    },
});

const itemsRefs = ref<HTMLElement[]>([]);

let checkedType: CandidType = props.type;
let checkedCanExportValues: boolean = props.canExportValues;
let checkedInnerValues: ValueItem[] = [...props.innerValues];
let checkedOuterValues: ValueItem[] = [...props.outerValues];

// The correct data is passed down down
const recordItems = ref<ArgumentConstraint[]>(props.initial.items);

// Receive data that is passed upward
let recordItemsResults: DataResult<ArgumentConstraint>[] = parseDataResult(
    recordItems.value,
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

    for (let i = 1; i < recordItems.value.length; i++) {
        const c = recordItems.value[i - 1]; // Get the previous data source

        let valueItems: ValueItem[] = [...last];

        findInnerValueItemsByArgumentConstraint(c, valueItems);

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("innerValues record argument constraint", result);

    return result;
});
// Each ArgumentConstraint on this page is likely to add Out Values
const outerValues = computed<ValueItem[][]>(() => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...props.outerValues]; // Passing data start

    result[0] = [...last];

    for (let i = 1; i < recordItems.value.length; i++) {
        const c = recordItems.value[i - 1]; // Get the previous data source

        let valueItems: ValueItem[] = [...last];

        findOuterValueItemsByArgumentConstraint(c, valueItems, [...innerValues.value[i]]);

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("outerValues record argument constraint", result);

    return result;
});

const hasContents = computed(() =>
    recordItems.value.map((constraint) => hasUIByArgumentConstraint(constraint)),
);

const marginTop = computed(() => {
    const r: boolean[] = [];
    for (let i = 0; i < recordItems.value.length; i++) {
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

    const newRecordItems = props.initial.items;

    const newRecordItemsResults = parseDataResult(
        newRecordItems,
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
        same(recordItems.value, newRecordItems) &&
        same(recordItemsResults, newRecordItemsResults)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedType = newCheckedType;
    checkedCanExportValues = newCheckedCanExportValues;
    checkedInnerValues = newCheckedInnerValues;
    checkedOuterValues = newCheckedOuterValues;

    recordItems.value = newRecordItems;

    recordItemsResults = newRecordItemsResults;

    initialed = true;

    changed();
};

const onRecordItemsChanged = (i: number, r: DataResult<ArgumentConstraint>) => {
    recordItemsResults[i] = r;

    if (r.ok !== undefined) recordItems.value[i] = r.ok;

    changed();
};

const produce = (): DataResult<RecordArgumentConstraint> => {
    if (!initialed)
        return {
            err: { message: `${props.status} record argument constraint has not been initial.` },
        };

    for (let i = 0; i < recordItemsResults.length; i++) {
        const err = recordItemsResults[i].err;
        if (err) return { err };
    }

    const ok: RecordArgumentConstraint = props.initial;

    ok.items = recordItemsResults.map((r) => r.ok!);

    delete ok.runtime;

    let runtime: CandidValueObject | undefined = {};
    for (let i = 0; i < ok.items.length; i++) {
        const item = ok.items[i];
        if (item.runtime?.ok === undefined) {
            runtime = undefined;
            break;
        }
        runtime[props.type.items[i].key] = item.runtime.ok;
    }

    if (runtime !== undefined) ok.runtime = { ok: runtime };

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<RecordArgumentConstraint>];
}>();

const changed = () =>
    checkAndExecute(
        (props.status !== 'using' ||
            itemsRefs.value.filter((v) => !!v).length >= recordItems.value.length) &&
            recordItemsResults.length >= recordItems.value.length,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-light-record-argument-constraint-content">
        <div
            class="item"
            v-for="(subitem, i) in recordItems"
            :key="i"
            :record-key="props.type.items[i].key"
        >
            <template v-if="hasContents[i]">
                <input type="text" disabled v-model="props.type.items[i].key" />
            </template>
            <RunningLightArgumentConstraintVue
                :layer="props.layer + 1"
                :argResult="
                    props.argResult?.ok !== undefined && props.argResult.ok[props.type.items[i].key] ? ({ ok: props.argResult.ok[props.type.items[i].key] } as StringResult<CandidValue>) : undefined
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
                @changed="(r) => onRecordItemsChanged(i, r)"
                :ref="(el: any) => (itemsRefs[i] = el)"
            />
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-light-record-argument-constraint-content {
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
            display: none;
        }
    }
}
</style>
