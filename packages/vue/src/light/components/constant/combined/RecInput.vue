<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import {
    CandidType,
    CandidValue,
    checkCandidValue,
    findRecType,
    RecItem,
} from '@mora-light/core/types/candid';
import { DataResult, deepClone, same } from '@mora-light/core/types/common';
import ConstantInputVue from '../ConstantInput.vue';

const getSubtype = (
    subtype: CandidType | undefined,
    recItems: RecItem[],
    id: number,
): CandidType => {
    if (subtype !== undefined) return subtype;
    const found = findRecType(recItems, id);
    if (found === undefined) throw new Error('can not find rec type');
    return deepClone(found.subtype);
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
    id: {
        type: Number,
        required: true, // REC must have ID
    },
    subtype: {
        type: Object as PropType<CandidType>,
        required: false, // It may be undefined, indicating that the corresponding type must be found according to the ID
    },
    initial: {
        validator: (v) => v !== undefined, // There are many types, which is inconvenient to verify
        required: true,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

let checkedRecItems: RecItem[] = props.recItems;
let checkedId: Number = props.id;
let checkedSubtype: CandidType | undefined = props.subtype;

const subtype = ref<CandidType>(getSubtype(props.subtype, props.recItems, props.id));
const value = ref<CandidValue>(props.initial as CandidValue);

let valueResult: DataResult<CandidValue> = { ok: value.value };

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.recItems, props.id, props.subtype, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedRecItems = props.recItems;
    const newCheckedId = props.id;
    const newCheckedSubtype = props.subtype;

    const newSubtype = getSubtype(newCheckedSubtype, newCheckedRecItems, newCheckedId);
    const newValue = props.initial as CandidValue;

    // Check if Value matches
    if (!checkCandidValue(newSubtype, newValue, newCheckedRecItems)) {
        throw new Error('wrong value for rec type');
    }

    const newValueResult: DataResult<CandidValue> = { ok: newValue };

    if (
        initialed &&
        same(checkedRecItems, newCheckedRecItems) &&
        same(checkedId, newCheckedId) &&
        same(checkedSubtype, newCheckedSubtype) &&
        same(subtype.value, newSubtype) &&
        same(value.value, newValue) &&
        same(valueResult, newValueResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedRecItems = newCheckedRecItems;
    checkedId = newCheckedId;
    checkedSubtype = newCheckedSubtype;

    subtype.value = newSubtype; // Each external change is set up a new value
    value.value = newValue; // Each external change is set up a new value

    valueResult = newValueResult;

    initialed = true;

    changed();
};

const onValueChanged = (r: DataResult<CandidValue>) => {
    valueResult = r;

    if (r.ok !== undefined) value.value = r.ok;

    changed(); // Internal changes should be triggered upward
};

const produce = (): DataResult<CandidValue> => {
    if (!initialed) return { err: { message: `rec input has not been initial.` } };

    if (valueResult.err !== undefined) return { err: valueResult.err };

    return { ok: valueResult.ok };
};

const emit = defineEmits<{
    changed: [DataResult<CandidValue>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="rec-input-content">
        <ConstantInputVue
            :layer="props.layer + 1"
            :recItems="props.recItems"
            :initial="{ type: subtype, value }"
            :disabled="props.disabled"
            @changed="onValueChanged"
        />
    </div>
</template>

<style lang="less" scoped>
.rec-input-content {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: flex-start;
}
</style>
