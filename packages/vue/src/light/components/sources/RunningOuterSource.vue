<script lang="ts" setup>
import { computed, onBeforeMount, onUnmounted, PropType, ref, watch } from 'vue';
import {
    CandidValueItem,
    ComponentStatus,
    RunningLight,
    ValueItem,
    isCandidType,
} from '@mora-light/core/types/running';
import { DataSourceOuter } from '@mora-light/core/types/source';
import {
    CandidType,
    CandidValue,
    findAloneType,
    isSameCandidType,
} from '@mora-light/core/types/candid';
import {
    assignRuntime,
    checkAndExecute,
    DataResult,
    deepClone,
    deleteRuntime,
    same,
    StringResult,
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
            outerValues: ValueItem[];
        }>,
        required: true,
    },
    index: {
        type: Number,
        required: false, // Display serial number
    },
    initial: {
        type: Object as PropType<DataSourceOuter>,
        required: true,
    },
});

const SUBSCRIBE_ID = props.runningLight.getNextSubscribeId();

const selectRef = ref<HTMLElement>();

let checkedOuterValues: ValueItem[] = [...props.values.outerValues];

let need = props.initial.outer.result;
const outerName = ref(props.initial.outer.name ?? '');

// Must be filtered out of the consistent variable
const outerValues = computed<CandidValueItem[]>(
    () =>
        props.values.outerValues.filter(
            (value) =>
                isCandidType(value) &&
                isSameCandidType(
                    findAloneType(value.type as CandidType).type,
                    props.initial.outer.result,
                ),
        ) as CandidValueItem[],
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
    if (props.initial.source !== 'outer') return;

    const newCheckedOuterValues = [...props.values.outerValues];

    const newNeed = props.initial.outer.result;
    let newOuterName = props.initial.outer.name ?? '';
    if (newOuterName && !outerValues.value.find((value) => value.name === newOuterName))
        newOuterName = '';

    if (
        initialed &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(need, newNeed) &&
        same(outerName.value, newOuterName)
    ) {
        return;
    }

    checkedOuterValues = newCheckedOuterValues;

    need = newNeed;
    outerName.value = newOuterName;

    subscribe();

    initialed = true;

    changed();
};

const onOuterNameChanged = () => {
    const item = outerValues.value.find((value) => value.name === outerName.value);
    if (item) {
        outerName.value = item.name;
        need = findAloneType(item.type).type;
        onRuntimeChanged();
    } else {
        outerName.value = '';
        deleteRuntime(props.initial.outer.result); // Delete the running variable when there are errors
        changed();
    }
};

watch(
    () => outerName.value,
    () => subscribe(),
);
// Change of monitoring objects
const subscribe = () => {
    props.runningLight.outerPool.unsubscribe(SUBSCRIBE_ID);
    if (outerName.value)
        props.runningLight.outerPool.subscribe(outerName.value, SUBSCRIBE_ID, onRuntimeChanged);
    onRuntimeChanged(); // Take the initiative
};
onUnmounted(() => props.runningLight.outerPool.unsubscribe(SUBSCRIBE_ID));

// If the object of monitoring
const onRuntimeChanged = () => {
    if (!outerName.value) return;

    const runtimeResult = props.runningLight.outerPool.findValue(
        outerName.value,
    ) as StringResult<CandidValue>;

    if (runtimeResult !== undefined) {
        assignRuntime(props.initial.outer.result, deepClone(runtimeResult)); // The wrong value is also passed on
    } else {
        deleteRuntime(props.initial.outer.result); // Delete the running variable when there are errors
    }

    changed();
};

const produce = (): DataResult<DataSourceOuter> => {
    if (!initialed)
        return { err: { message: `${props.status} outer source has not been initial.` } };

    if (!outerName.value || !outerValues.value.find((value) => value.name === outerName.value))
        return { err: { message: `outer variable must has name`, el: selectRef.value } };

    const ok: DataSourceOuter = props.initial;

    ok.outer.result = need;
    ok.outer.name = outerName.value;

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<DataSourceOuter>];
}>();

const changed = () =>
    checkAndExecute(
        props.status !== 'using' || !!selectRef.value,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-outer-source-content" v-if="props.status === 'using'">
        <span> Outer Variable </span>
        <div class="outer-content">
            <div class="tip">
                <div class="type">
                    <span>Import Type</span>
                    <!-- How to provide a component to choose candid type-->
                    <!-- <ChooseCandidTypeVue :disabled="true" :initial="props.initial.outer.result" /> -->
                </div>
            </div>
            <div class="right">
                <div class="blank"></div>
                <div class="input">
                    <span v-if="props.initial.outer.label">{{ props.initial.outer.label }}</span>
                    <div class="select">
                        <select v-model="outerName" @change="onOuterNameChanged" ref="selectRef">
                            <option v-for="item in outerValues" :key="item.name" :value="item.name">
                                {{ item.name }}
                            </option>
                        </select>
                    </div>
                    <span class="outer-name-error" v-if="!outerName">
                        {{ `Please select external variables, Optional: ${outerValues.length}` }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-outer-source-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    > span {
        font-size: 12px;
        opacity: 0.5;
    }
    > .outer-content {
        margin-top: 5px;
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
        > .tip {
            width: 100%;
            > .type {
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
                align-items: flex-start;
                > span {
                    width: 70px;
                    height: 28px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                }
            }
        }
        > .right {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            padding-bottom: 10px;
            > .blank {
                width: 10px;
                height: 100%;
            }
            > .input {
                width: 220px;
                flex-shrink: 0;
                border-left: 1px solid #ccc;
                padding-left: 10px;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: flex-start;
                > .select {
                    margin-top: 5px;
                    width: 100%;
                    height: 28px;
                    > select {
                        width: 100%;
                        height: 100%;
                        border: 1px solid #77777755;
                        padding-left: 5px;
                    }
                }
                > .outer-name-error {
                    margin-top: 5px;
                    flex-shrink: 0;
                    font-size: 14px;
                    color: #880000;
                }
            }
        }
    }
}
</style>
