<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import {
    CandidType,
    CandidTypeSubitem,
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

type Subitem = { key: string; type: CandidType; value: CandidValue };

const props = defineProps({
    layer: {
        type: Number,
        required: true,
    },
    recItems: {
        type: Array as PropType<RecItem[]>,
        required: true, // The type that once appeared
    },
    subitems: {
        type: Array as PropType<CandidTypeSubitem[]>,
        required: true,
    },
    initial: {
        type: Array,
        required: true,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

let checkedRecItems: RecItem[] = props.recItems;

// The correct data is passed down
const subitems = ref<Subitem[]>(
    props.subitems.map((subitem) => {
        return {
            key: subitem.key,
            type: copyCandidType(subitem.type),
            value:
                props.initial[subitem.key] ??
                getInitialCandidTypeValue(subitem.type, props.recItems, []),
        };
    }),
);

// Receive data that is passed upward
let subitemsResults: DataResult<CandidValue>[] = parseDataResultArray(
    subitems.value.map((subitem) => subitem.value),
);

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.recItems, props.subitems, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedRecItems = props.recItems;

    const newSubitems: Subitem[] = [];
    for (let i = 0; i < props.subitems.length; i++) {
        const subitem = props.subitems[i];
        newSubitems[i] = {
            key: subitem.key,
            type: copyCandidType(subitem.type),
            value: (props.initial[i] ??
                getInitialCandidTypeValue(subitem.type, newCheckedRecItems, [])) as CandidValue,
        };
    }

    const newSubitemsResults = parseDataResultArray(newSubitems.map((subitem) => subitem.value));

    if (
        initialed &&
        same(checkedRecItems, newCheckedRecItems) &&
        same(subitems.value, newSubitems) &&
        same(subitemsResults, newSubitemsResults)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedRecItems = newCheckedRecItems;

    subitems.value = newSubitems; // Each external change is set up a new value

    subitemsResults = newSubitemsResults;

    initialed = true;

    changed();
};

const onChanged = (i: number, r: DataResult<CandidValue>) => {
    subitemsResults[i] = r;

    if (r.ok !== undefined) subitems.value[i].value = r.ok;

    changed();
};

const produce = (): DataResult<CandidValue> => {
    if (!initialed) return { err: { message: `tuple input has not been initial.` } };

    const ok: CandidValue[] = [];

    for (let i = 0; i < subitems.value.length; i++) {
        const r = subitemsResults[i];

        if (r.err !== undefined) return { err: r.err };

        ok[i] = r.ok;
    }

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<CandidValue>];
}>();

const changed = () =>
    checkAndExecute(
        subitemsResults.length >= subitems.value.length,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="tuple-input-content">
        <div class="item" v-for="(subitem, i) in subitems" :key="i">
            <span>{{ `${i}` }}</span>
            <span class="colon">:</span>
            <ConstantInputVue
                :layer="props.layer + 1"
                :recItems="props.recItems"
                :initial="{ type: subitem.type, value: subitem.value }"
                :disabled="props.disabled"
                @changed="(r) => onChanged(i, r)"
            />
        </div>
    </div>
</template>

<style lang="less" scoped>
.tuple-input-content {
    width: 100%;
    padding-left: 10px;
    > .item {
        margin-top: 10px;
        &:first-child {
            margin-top: 0px;
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
    }
}
</style>
