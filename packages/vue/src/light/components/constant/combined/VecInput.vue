<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import {
    CandidType,
    CandidValue,
    copyCandidType,
    getInitialCandidTypeValue,
    RecItem,
} from '@mora-light/core/types/candid';
import {
    checkAndExecute,
    DataResult,
    parseDataResultArray,
    same,
} from '@mora-light/core/types/common';
import ConstantInputVue from '../ConstantInput.vue';

const checkLength = (
    values: CandidValue[],
    length: number | undefined,
    type: CandidType,
    recItems: RecItem[],
): CandidValue[] => {
    values = [...values];
    if (length !== undefined) {
        // Detect whether the length is matched
        while (values.length < length) values.push(getInitialCandidTypeValue(type, recItems, []));
        while (values.length > length) values.splice(values.length - 1, 1);
    }
    return values;
};

const props = defineProps({
    layer: {
        type: Number,
        required: true,
    },
    recItems: {
        type: Array as PropType<RecItem[]>,
        required: true, // The type that once appeared
    },
    subtype: {
        type: Object as PropType<CandidType>,
        required: true, // Must specify subtype
    },
    length: {
        type: Number,
        required: false, // Can not limit the length
    },
    initial: {
        type: Array as PropType<CandidValue[]>,
        required: true,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

let checkedRecItems: RecItem[] = props.recItems;
let checkedSubtype: CandidType = copyCandidType(props.subtype);
let checkedLength: number | undefined = props.length; // Is there a limit length?

// The correct data is passed down down
const values = ref<CandidValue[]>(
    checkLength(props.initial, props.length, props.subtype, props.recItems),
);

// Receive data that is passed upward
let valuesResults: DataResult<CandidValue>[] = parseDataResultArray(values.value);

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.recItems, props.subtype, props.initial, props.length],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedRecItems = props.recItems;
    const newCheckedSubtype = copyCandidType(props.subtype);
    const newCheckedLength = props.length;

    const newValues = checkLength(
        props.initial,
        newCheckedLength,
        newCheckedSubtype,
        newCheckedRecItems,
    );

    const newValuesResults = parseDataResultArray(newValues);

    if (
        initialed &&
        same(checkedRecItems, newCheckedRecItems) &&
        same(checkedSubtype, newCheckedSubtype) &&
        same(checkedLength, newCheckedLength) &&
        same(values.value, newValues) &&
        same(valuesResults, newValuesResults)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedRecItems = newCheckedRecItems;
    checkedSubtype = newCheckedSubtype;
    checkedLength = newCheckedLength;

    values.value = newValues;

    valuesResults = newValuesResults;

    initialed = true;

    changed();
};

const onPush = () => {
    values.value.push(getInitialCandidTypeValue(props.subtype, props.recItems, []));
    valuesResults.push({ ok: values.value[values.value.length - 1] });

    changed();
};

const onDelete = (i: number) => {
    if (values.value.length > i) {
        values.value.splice(i, 1);
        valuesResults.splice(i, 1);

        changed();
    }
};

const onChanged = (i: number, r: DataResult<CandidValue>) => {
    valuesResults[i] = r;

    if (r.ok !== undefined) values.value[i] = r.ok;

    changed();
};

const produce = (): DataResult<CandidValue[]> => {
    if (!initialed) return { err: { message: `vec input has not been initial.` } };

    const ok: CandidValue[] = [];

    for (let i = 0; i < values.value.length; i++) {
        const r = valuesResults[i];

        if (r.err !== undefined) return { err: r.err };

        ok.push(r.ok);
    }

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<CandidValue>];
}>();

const changed = () =>
    checkAndExecute(
        valuesResults.length >= values.value.length,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="vec-input-content">
        <div class="item" v-for="(subitem, i) in values" :key="i">
            <div class="left">
                <span>{{ `${i}` }}</span>
                <span class="colon">:</span>
            </div>
            <div class="right">
                <div class="main">
                    <!-- <span class="label" v-if="subtype.label">{{ subtype.label }}</span> -->
                    <ConstantInputVue
                        :layer="props.layer + 1"
                        :recItems="props.recItems"
                        :initial="{ type: subtype, value: subitem }"
                        :disabled="props.disabled"
                        @changed="(r) => onChanged(i, r)"
                    />
                </div>
                <div class="delete" v-if="length === undefined">
                    <div @click="onDelete(i)">-</div>
                </div>
            </div>
        </div>
        <div class="push" v-if="length === undefined" @click="onPush">+</div>
    </div>
</template>

<style lang="less" scoped>
.vec-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    > div {
        width: 100%;
        margin-top: 10px;
        &:first-child {
            margin-top: 0px;
        }
    }
    > .item {
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
        > .left {
            display: flex;
            flex-direction: row;
            justify-content: flex-start;
            align-items: center;
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
        }
        > .right {
            width: 100%;
            border: 1px solid #33333344;
            padding: 5px;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
            > .main {
                width: 100%;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: flex-start;
            }
            > .delete {
                margin-left: 5px;
                height: 28px;
                width: 50px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                > div {
                    width: 100%;
                    height: 22px;
                    border: 1px solid #33333344;
                    border-radius: 5px;
                    display: flex;
                    flex-direction: row;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    cursor: pointer;
                    user-select: none;
                }
            }
        }
    }
    > .push {
        margin-top: 10px;
        width: 100%;
        height: 22px;
        border: 1px solid #33333344;
        border-radius: 5px;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        text-align: center;
        cursor: pointer;
        user-select: none;
    }
}
</style>
