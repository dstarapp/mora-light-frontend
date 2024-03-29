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
    showNull: {
        type: Boolean,
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
    select: {
        type: String,
        required: false,
    },
    initial: {
        type: Object,
        required: true,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

let checkedRecItems: RecItem[] = props.recItems;

// The correct data is passed down down
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

const current = ref(props.select ?? ''); // The selected value of the logo

// Receive data that is passed upward
let subitemsResults: DataResult<CandidValue>[] = parseDataResultArray(
    subitems.value.map((subitem) => subitem.value),
);

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.recItems, props.subitems, props.select, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedRecItems = props.recItems;

    const newSubitems = props.subitems!.map((subitem) => {
        return {
            key: subitem.key,
            type: copyCandidType(subitem.type),
            value:
                props.initial[subitem.key] ??
                getInitialCandidTypeValue(subitem.type, newCheckedRecItems, []),
        };
    });
    let newCurrent = props.select ?? '';
    for (let i = 0; i < newSubitems.length; i++)
        if (props.initial[newSubitems[i].key] !== undefined) newCurrent = newSubitems[i].key;

    const newSubitemsResults = parseDataResultArray(newSubitems.map((subitem) => subitem.value));

    if (
        initialed &&
        same(checkedRecItems, newCheckedRecItems) &&
        same(subitems.value, newSubitems) &&
        same(current.value, newCurrent) &&
        same(subitemsResults, newSubitemsResults)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedRecItems = newCheckedRecItems;

    subitems.value = newSubitems; // Each external change is set up a new value

    current.value = newCurrent;

    subitemsResults = newSubitemsResults;

    initialed = true;

    changed();
};

watch(
    () => current.value,
    () => changed(),
);
// watch(
//     () => props.select,
//     (nv, ov) => {
//         if (nv) current.value = nv;
//     },
// );

const onChanged = (i: number, r: DataResult<CandidValue>) => {
    subitemsResults[i] = r;

    if (r.ok !== undefined) subitems.value[i].value = r.ok;

    changed();
};

const produce = (): DataResult<CandidValue> => {
    if (!initialed) return { err: { message: `variant input has not been initial.` } };

    const ok = {};

    for (let i = 0; i < subitems.value.length; i++) {
        const key = subitems.value[i].key;
        if (key === current.value) {
            const value = subitemsResults[i];

            if (value.err !== undefined) return { err: value.err };

            ok[key] = value.ok;
            break;
        }
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
    <div class="variant-input-content">
        <!-- <template v-for="(subitem, i) in subitems" :key="i">
            <div class="item" v-if="!props.select || props.select === subitem.key">
                <template v-if="!props.select">
                    <div class="radio">
                        <input :value="subitem.key" v-model="current" type="radio" />
                    </div>
                </template>
                <input class="key" type="text" disabled v-model="subitem.key" />
                <ConstantInputVue
                    v-if="
                        (current === subitem.key || props.select === subitem.key) &&
                        (subitem.type.type !== 'null' || props.showNull)
                    "
                    :layer="props.layer + 1"
                    :recItems="props.recItems"
                    :initial="{ type: subitem.type, value: subitem.value }"
                    :disabled="props.disabled"
                    @changed="(r) => onChanged(i, r)"
                />
            </div>
        </template> -->
        <select class="select" v-model="current">
            <option v-for="subitem in subitems" :key="subitem.key" :value="subitem.key">
                {{ subitem.key }}
            </option>
        </select>
        <template v-for="(subitem, i) in subitems" :key="subitem.key">
            <ConstantInputVue
                v-if="
                    (current === subitem.key || props.select === subitem.key) &&
                    (subitem.type.type !== 'null' || props.showNull)
                "
                :layer="props.layer + 1"
                :recItems="props.recItems"
                :initial="{ type: subitem.type, value: subitem.value }"
                :disabled="props.disabled"
                @changed="(r) => onChanged(i, r)"
            />
        </template>
    </div>
</template>

<style lang="less" scoped>
.variant-input-content {
    width: 100%;
    > .item {
        margin-top: 10px;
        &:first-child {
            margin-top: 0px;
        }
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: flex-start;
        > .radio {
            margin-right: 10px;
            height: 28px;
            display: flex;
            align-items: center;
        }
        > .key {
            margin-right: 10px;
            width: 120px;
            height: 28px;
            border: 1px solid #77777755;
            padding-left: 5px;
        }
    }
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: flex-start;
}
</style>
