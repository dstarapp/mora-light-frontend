<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import {
    CandidValueItem,
    ComponentStatus,
    RunningLight,
    ValueItem,
    isCandidType,
} from '@mora-light/core/types/running';
import { DataSourceProp } from '@mora-light/core/types/source';
import {
    CandidType,
    CandidValue,
    findAloneType,
    isSameCandidType,
} from '@mora-light/core/types/candid';
import {
    assignRuntime,
    DataResult,
    deepClone,
    readRuntime,
    same,
} from '@mora-light/core/types/common';

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    runningLight: {
        type: Object as PropType<RunningLight>,
        required: true,
    },
    values: {
        type: Object as PropType<{
            propValues: ValueItem[];
        }>,
        required: true,
    },
    index: {
        type: Number,
        required: false, // Display serial number
    },
    initial: {
        type: Object as PropType<DataSourceProp>,
        required: true,
    },
});

let need = props.initial.prop.result;
const propName = ref(props.initial.prop.name ?? '');

let checkedSource: DataSourceProp = props.initial;

// Must be filtered out of the consistent variable
const propValues = computed<CandidValueItem[]>(
    () =>
        props.values.propValues.filter(
            (value) =>
                isCandidType(value) &&
                isSameCandidType(
                    findAloneType(value.type as CandidType).type,
                    props.initial.prop.result,
                ),
        ) as CandidValueItem[],
);

const propValue = computed<CandidValueItem | undefined>(() =>
    propValues.value.find((value) => value.name === propName.value),
);

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.values, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    if (props.initial.source !== 'prop') return;

    const newNeed = props.initial.prop.result;
    let newPropName = props.initial.prop.name ?? '';
    const newCheckedSource = props.initial;

    if (
        initialed &&
        same(need, newNeed) &&
        same(propName.value, newPropName) &&
        same(checkedSource, newCheckedSource)
    ) {
        return;
    }

    if (propValue.value && propValue.value.extra.constant) {
        assignRuntime<CandidValue>(newNeed, deepClone(propValue.value.extra.runtime));
    } else {
        assignRuntime<CandidValue>(newNeed, {
            err: `prop value ${newPropName} is missing.`,
        });
    }

    // console.error('prop init need', newNeed);

    need = newNeed;
    propName.value = newPropName;

    initialed = true;

    changed();
};

const produce = (): DataResult<DataSourceProp> => {
    if (!initialed)
        return { err: { message: `${props.status} prop source has not been initial.` } };

    // console.error('prop produce', props.values.propValues);
    // console.error('prop produce', props.initial.prop.result);
    // console.error('prop produce', propValues.value);
    // console.error('prop produce', propName.value);
    // console.error('prop produce', propValue.value);
    // console.error('prop produce', need);

    if (!propValue.value)
        return { err: { message: `prop variable ${propName.value} must has value` } };

    const ok: DataSourceProp = props.initial;

    ok.prop.result = need;
    ok.prop.name = propName.value;

    const runtime = readRuntime<CandidValue>(ok.prop.result);
    if (runtime?.err !== undefined) {
        return { err: { message: runtime.err } };
    }

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<DataSourceProp>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-prop-source-content" v-if="props.status === 'using'">
        <span> Prop Value </span>
    </div>
</template>

<style lang="less" scoped>
.running-prop-source-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    > span {
        font-size: 12px;
        opacity: 0.5;
    }
}
</style>
