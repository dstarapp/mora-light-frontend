<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import {
    CandidType,
    CandidValue,
    copyCandidType,
    getInitialCandidTypeValue,
    RecItem,
} from '@mora-light/core/types/candid';
import { DataResult, same } from '@mora-light/core/types/common';
import ConstantInputVue from '../ConstantInput.vue';

const checkValue = (
    value: [] | CandidValue[],
    has: boolean | undefined,
    type: CandidType,
    recItems: RecItem[],
): CandidValue[] => {
    value = [...value];
    if (has !== undefined && has && value.length === 0) {
        // Detect whether the length is matched
        value = [getInitialCandidTypeValue(type, recItems, [])];
    }
    return value;
};

const props = defineProps({
    layer: {
        type: Number,
        required: true,
    },
    showNull: {
        type: Boolean,
        required: true,
    },
    recItems: {
        type: Array as PropType<RecItem[]>,
        required: true, // The type that once appeared
    },
    subtype: {
        type: Object as PropType<CandidType>,
        required: true,
    },
    has: {
        type: Boolean,
        require: false,
    },
    initial: {
        type: Array as PropType<[] | CandidValue[]>,
        required: true,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

let checkedRecItems: RecItem[] = props.recItems;
let checkedSubtype: CandidType = copyCandidType(props.subtype);

const value = ref<[] | CandidValue[]>(
    checkValue(props.initial, props.has, props.subtype, props.recItems),
);

const chosen = ref<boolean>(!!value.value.length);

let valueResult: DataResult<CandidValue> = {
    ok: value.value.length
        ? value.value[0]
        : getInitialCandidTypeValue(props.subtype, props.recItems, []),
};

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.recItems, props.subtype, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedRecItems = props.recItems;
    const newCheckedSubtype = copyCandidType(props.subtype);

    const newValue = checkValue(props.initial, props.has, newCheckedSubtype, newCheckedRecItems);
    const newChosen = !!newValue.length;
    const newValueResult: DataResult<CandidValue> = {
        ok: newValue.length
            ? newValue[0]
            : getInitialCandidTypeValue(newCheckedSubtype, newCheckedRecItems, []),
    };

    if (
        initialed &&
        same(checkedRecItems, newCheckedRecItems) &&
        same(checkedSubtype, newCheckedSubtype) &&
        same(value.value, newValue) &&
        same(chosen.value, newChosen) &&
        same(valueResult, newValueResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedRecItems = newCheckedRecItems;
    checkedSubtype = newCheckedSubtype;

    value.value = newValue; // Each external change is set up a new value
    chosen.value = newChosen;

    valueResult = newValueResult;

    initialed = true;

    changed();
};

const onChosenChanged = () => {
    chosen.value = !chosen.value;
    if (chosen.value && valueResult.err !== undefined) {
        // Selected, but it is the wrong value, so initialize
        const ok = getInitialCandidTypeValue(props.subtype, props.recItems, []);
        value.value = [ok];
        valueResult = { ok }; // Put the direct value into the DataResult, pay attention to becoming an array when using
    }
    changed(); // Internal changes should be triggered upward
};

const onValueChanged = (r: DataResult<CandidValue>) => {
    valueResult = r;

    if (r.ok !== undefined) value.value = [r.ok];

    changed(); // Internal changes should be triggered upward
};

const produce = (): DataResult<[] | any[]> => {
    if (!initialed) return { err: { message: `opt input has not been initial.` } };

    if (!chosen.value) return { ok: [] }; // If you have no choice, return to the empty array and indicate no

    if (valueResult.err !== undefined) return { err: valueResult.err };

    return { ok: [valueResult.ok] };
};

const emit = defineEmits<{
    changed: [DataResult<[] | any[]>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="opt-input-content">
        <div class="control" v-if="props.has === undefined">
            <input
                type="checkbox"
                :checked="chosen"
                :disabled="props.disabled"
                @change="onChosenChanged"
            />
            <span>
                {{ chosen ? 'Value' : 'None' }}
            </span>
        </div>
        <ConstantInputVue
            class="value-input"
            v-if="chosen && (subtype.type !== 'null' || props.showNull)"
            :layer="props.layer + 1"
            :recItems="props.recItems"
            :initial="{
                type: subtype,
                value: value.length
                    ? value[0]
                    : getInitialCandidTypeValue(subtype, props.recItems, []),
            }"
            :disabled="props.disabled"
            @changed="onValueChanged"
        />
    </div>
</template>

<style lang="less" scoped>
.opt-input-content {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: flex-start;

    > .control {
        margin-right: 10px;
        height: 28px;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;

        > span {
            margin-left: 5px;
            width: 40px;
            height: 28px;
            display: flex;
            align-items: center;
        }
    }
}
</style>
